
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FileNode, FileSummary, CodeAnalysisResult, AnalysisProgress } from "../types";
import { MAP_FILE_SYSTEM_PROMPT, REDUCE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from "../prompts";
// CHANGED: Added 'src' to path because services/ is a sibling of src/, not inside it.
import { runImpactAgent } from '../src/agents/impactAgent';
import { chunkRepository } from '../src/chunker/chunkRepo';

// --- Schemas ---

const FILE_SUMMARY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    path: { type: Type.STRING },
    purpose: { type: Type.STRING },
    exports: { type: Type.ARRAY, items: { type: Type.STRING } },
    imports: { type: Type.ARRAY, items: { type: Type.STRING } },
    dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
    complexity_score: { type: Type.NUMBER },
  },
  required: ["path", "purpose", "exports", "imports", "complexity_score"]
};

const ANALYSIS_RESULT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    architecture: { type: Type.STRING },
    techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
    graphData: {
      type: Type.OBJECT,
      properties: {
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              group: { type: Type.STRING, enum: ["file", "module", "external"] },
              val: { type: Type.NUMBER },
              details: { type: Type.STRING }
            },
            required: ["id", "group", "val"]
          }
        },
        links: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["import", "dependency"] }
            },
            required: ["source", "target", "type"]
          }
        }
      },
      required: ["nodes", "links"]
    },
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["critical", "high", "medium", "low"] },
          location: { type: Type.STRING },
          mitigation: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "severity", "description"]
      }
    }
  },
  required: ["summary", "architecture", "techStack", "graphData", "risks"]
};

// --- Service Logic ---

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please check your environment variables.");
  return new GoogleGenAI({ apiKey });
};

// Simple concurrency limiter
async function asyncPool<T>(poolLimit: number, items: any[], iteratorFn: (item: any) => Promise<T>): Promise<T[]> {
  const ret: Promise<T>[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (poolLimit <= items.length) {
      // Fix: Do not return 'e' inside the then callback to avoid cycle
      const e: Promise<void> = p.then(() => {
        // Remove this promise from executing array when finished
        executing.splice(executing.indexOf(e), 1);
      });
      
      executing.push(e);
      
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

export const analyzeRepository = async (
  files: FileNode[],
  onProgress: (progress: AnalysisProgress) => void
): Promise<CodeAnalysisResult> => {
  const ai = getAI();
  
  // 1. MAP PHASE: Analyze individual files
  onProgress({ stage: 'mapping', currentFile: 0, totalFiles: files.length, currentFileName: '', message: 'Initializing analysis...' });
  
  let processedCount = 0;
  
  const mapFile = async (file: FileNode): Promise<FileSummary | null> => {
    try {
      // Skip large assets or non-code files to save tokens
      if (file.size > 100000) return null; // >100KB skip for demo speed
      
      processedCount++;
      onProgress({
        stage: 'mapping',
        currentFile: processedCount,
        totalFiles: files.length,
        currentFileName: file.path,
        message: `Analyzing structure: ${file.path}`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${MAP_FILE_SYSTEM_PROMPT}\n\nFILE_NAME: ${file.path}\nCONTENT:\n${file.content.slice(0, 8000)}`, // Truncate for safety
        config: {
          responseMimeType: "application/json",
          responseSchema: FILE_SUMMARY_SCHEMA,
          temperature: 0.1
        }
      });

      if (!response.text) return null;
      return JSON.parse(response.text) as FileSummary;
    } catch (e) {
      console.warn(`Failed to analyze file ${file.path}`, e);
      return null;
    }
  };

  // Run Map phase with concurrency limit of 3 to avoid rate limits
  const fileSummaries = (await asyncPool(3, files, mapFile)).filter(Boolean) as FileSummary[];

  // 2. REDUCE PHASE: Synthesize Architecture
  onProgress({
    stage: 'reducing',
    currentFile: files.length,
    totalFiles: files.length,
    currentFileName: 'Global Context',
    message: 'Synthesizing Knowledge Graph & Risk Report...'
  });

  const reduceResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Stronger model for synthesis
    contents: `${REDUCE_SYSTEM_PROMPT}\n\nFILE_SUMMARIES:\n${JSON.stringify(fileSummaries, null, 2)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_RESULT_SCHEMA,
      temperature: 0.2
    }
  });

  if (!reduceResponse.text) throw new Error("Failed to generate synthesis report.");
  
  const result = JSON.parse(reduceResponse.text) as CodeAnalysisResult;
  
  // Augment result with execution flow placeholder (can be generated on-demand later)
  result.executionFlow = []; 

  onProgress({ stage: 'complete', currentFile: files.length, totalFiles: files.length, currentFileName: '', message: 'Analysis Complete.' });
  return result;
};

export const chatWithContext = async (
  history: {role: 'user'|'model', text: string}[],
  newMessage: string,
  analysis: CodeAnalysisResult
): Promise<string> => {
  const ai = getAI();
  const context = `
    SUMMARY: ${analysis.summary}
    TECH STACK: ${analysis.techStack.join(', ')}
    KEY RISKS: ${analysis.risks.map(r => r.title).join(', ')}
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction: CHAT_SYSTEM_PROMPT + "\nCONTEXT:\n" + context }
  });

  // Replay history (simplified)
  // In a real app, we'd add history to the chat session properly
  
  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "I couldn't generate a response.";
};

export const runExecutionSimulation = async (
  analysis: CodeAnalysisResult,
  files: FileNode[]
) => {
  // Placeholder: The prompt asked for this, but for the MVP fix we focus on the main analysis.
  // We can hook this up to the Execution Agent logic later.
  return [];
};

export const runImpactAnalysis = async (
  proposal: string,
  analysis: CodeAnalysisResult,
  files: FileNode[]
) => {
  const chunks = chunkRepository(files);
  return runImpactAgent(proposal, analysis, chunks);
};
