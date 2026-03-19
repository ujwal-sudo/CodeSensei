import { FileNode, FileSummary, CodeAnalysisResult, AnalysisProgress, GraphNode, GraphLink, RiskItem } from "../types";
import { MAP_FILE_SYSTEM_PROMPT, REDUCE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from "../prompts";
import { runImpactAgent } from '../src/agents/impactAgent';
import { chunkRepository } from '../src/chunker/chunkRepo';
import { keyManager } from '../src/utils/keyManager';
import PQueue from 'p-queue';

// --- Constants ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Using nvidia/nemotron-3-nano-30b-a3b:free for all tasks (data policy compatible)
const MODEL_NAME = "nvidia/nemotron-3-nano-30b-a3b:free";

// --- Config ---
// Robust Request Manager Configuration
const QUEUE_CONCURRENCY = 3;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2000;
const BACKOFF_MULTIPLIER = 2;

// Initialize Request Queue
const queue = new PQueue({ concurrency: QUEUE_CONCURRENCY });

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper: Robust OpenRouter API Call ---
async function callOpenRouter(
  messages: { role: string; content: string }[],
  jsonMode: boolean = false
): Promise<string> {

  let lastError: Error | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;

  // Retry Loop
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      // 1. Get Key (Rotates automatically)
      const apiKey = keyManager.getNextKey();

      const body: any = {
        model: MODEL_NAME,
        messages: messages,
        temperature: jsonMode ? 0.1 : 0.7,
      };

      if (jsonMode) {
        body.response_format = { type: "json_object" };
      }

      console.log(`[GeminiService] Request attempt ${attempt} (Queue Pending: ${queue.pending}, Active: ${queue.size})...`);

      // 2. Make Request
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://codesensei.ai",
          "X-Title": "CodeSensei",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`OpenRouter API Error (${response.status}): ${errorText}`);

        // 3. Handle Bad Keys (401), Rate Limits (429) & Server Errors (503)
        if ((response.status === 401 || response.status === 429 || response.status === 503) && attempt <= MAX_RETRIES) {
          console.warn(`[GeminiService] Rate limit/Error hit (${response.status}). Switching keys and backing off for ${backoffMs}ms...`);
          await sleep(backoffMs);
          backoffMs *= BACKOFF_MULTIPLIER;
          lastError = error;
          continue; // Retry with next key
        }

        throw error;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";

    } catch (error: any) {
      lastError = error;
      console.warn(`[GeminiService] Network/Unknown error: ${error.message}`);

      // Basic network retry
      if (attempt <= MAX_RETRIES) {
        await sleep(backoffMs);
        backoffMs *= BACKOFF_MULTIPLIER;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed to complete request after retries.");
}

// --- Analysis Logic ---

export const analyzeRepository = async (
  files: FileNode[],
  onProgress: (progress: AnalysisProgress) => void
): Promise<CodeAnalysisResult> => {

  // 1. MAP PHASE: Analyze individual files
  onProgress({ stage: 'mapping', currentFile: 0, totalFiles: files.length, currentFileName: '', message: 'Initializing Robust Analysis...' });

  let processedCount = 0;

  // Smart Chunking & Filtering
  const filesToProcess: FileNode[] = [];

  files.forEach(file => {
    // 1. Skip massive binary/minified files (> 500kb)
    if (file.size > 500000) return;

    const lines = file.content.split('\n');

    // 2. Split if > 1000 lines
    if (lines.length > 1000) {
      console.log(`[GeminiService] Splitting large file: ${file.path} (${lines.length} lines)`);
      const chunkSize = 1000;
      const totalChunks = Math.ceil(lines.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, lines.length);
        const chunkContent = lines.slice(start, end).join('\n');

        filesToProcess.push({
          ...file,
          path: `${file.path} [Part ${i + 1}/${totalChunks}]`,
          content: chunkContent
        });
      }
    } else {
      filesToProcess.push(file);
    }
  });

  const totalItems = filesToProcess.length;

  const mapFile = async (file: FileNode): Promise<FileSummary | null> => {
    try {
      // Content is already chunked in filesToProcess
      const prompt = `
${MAP_FILE_SYSTEM_PROMPT}

You must respond with a valid JSON object matching this structure:
{
  "path": "string",
  "purpose": "string",
  "exports": ["string"],
  "imports": ["string"],
  "dependencies": ["string (modules)"],
  "complexity_score": number
}

FILE_NAME: ${file.path}
CONTENT:
${file.content}
`;

      const result = await callOpenRouter([
        { role: "system", content: "You are a code analysis tool. valid JSON output only." },
        { role: "user", content: prompt }
      ], true);

      // Progress Update
      processedCount++;
      onProgress({
        stage: 'mapping',
        currentFile: processedCount,
        totalFiles: totalItems,
        currentFileName: file.path,
        message: `Analyzed: ${file.path}`
      });

      if (!result) return null;
      return JSON.parse(result) as FileSummary;

    } catch (e) {
      console.warn(`Failed to analyze file ${file.path}`, e);
      return null;
    }
  };

  // 2. Queue-based Execution
  console.log(`[GeminiService] Queueing ${filesToProcess.length} files with concurrency ${QUEUE_CONCURRENCY}...`);

  // Create promises mapped to the queue
  const tasks = filesToProcess.map(file => {
    return queue.add(() => mapFile(file));
  });

  // Wait for all queue tasks to finish
  const results = await Promise.all(tasks);
  const fileSummaries = results.filter(Boolean) as FileSummary[];


  // 3. REDUCE PHASE: Synthesize Architecture
  onProgress({
    stage: 'reducing',
    currentFile: totalItems,
    totalFiles: totalItems,
    currentFileName: 'Global Context',
    message: 'Synthesizing Knowledge Graph & Risk Report...'
  });

  const reducePrompt = `
${REDUCE_SYSTEM_PROMPT}

You must respond with a valid JSON object matching this structure:
{
  "summary": "string",
  "architecture": "string",
  "techStack": ["string"],
  "graphData": {
    "nodes": [{ "id": "string", "group": "file|module|external", "val": number, "details": "string" }],
    "links": [{ "source": "string", "target": "string", "type": "import|dependency" }]
  },
  "risks": [{
    "id": "string",
    "title": "string",
    "description": "string",
    "severity": "critical|high|medium|low",
    "location": "string",
    "mitigation": ["string"]
  }]
}

FILE_SUMMARIES:
${JSON.stringify(fileSummaries, null, 2)}
`;

  // Reduce phase is single heavy call, also retry-enabled
  const reduceContent = await callOpenRouter([
    { role: "system", content: "You are a principal software architect. valid JSON output only." },
    { role: "user", content: reducePrompt }
  ], true);

  if (!reduceContent) throw new Error("Failed to generate synthesis report.");

  const result = JSON.parse(reduceContent) as CodeAnalysisResult;
  result.executionFlow = [];

  onProgress({ stage: 'complete', currentFile: totalItems, totalFiles: totalItems, currentFileName: '', message: 'Analysis Complete.' });
  return result;
};

export const chatWithContext = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string,
  analysis: CodeAnalysisResult
): Promise<string> => {

  const buildSystemPrompt = (analysisResults: CodeAnalysisResult) => {
    const modules = (analysisResults.graphData?.nodes || []).filter((n: any) => n.group === 'module');
    const deps = (analysisResults.graphData?.links || []).map((l: any) => `${l.source} → ${l.target}`);
    const risks = analysisResults.risks || [];
    const criticalCount = risks.filter(r => r.severity === 'critical').length;
    const highCount = risks.filter(r => r.severity === 'high').length;

    return `You are an expert code analyst AI assistant for
the CodeSensei platform. You have just completed a full
multi-agent analysis of the following repository.

REPOSITORY: (unknown)
TOTAL FILES: (unknown)
LANGUAGE: ${(analysisResults.techStack || [])[0] || 'unknown'}

ARCHITECTURE SUMMARY:
${analysisResults.architecture || analysisResults.summary || '(missing)'}

MODULES DETECTED:
${modules.length > 0
  ? modules.map((m: any) => `- ${m.id}: ${String(m.details || '').slice(0, 160) || 'module'} (unknown files)`).join('\n')
  : '(none detected)'}

RISK ASSESSMENT:
${risks.length > 0
  ? risks.map(r => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description}`).join('\n')
  : '(none detected)'}

DEPENDENCY GRAPH:
${deps.length > 0 ? deps.map(d => `- ${d}`).join('\n') : '(none detected)'}

KEY METRICS:
- Graph nodes: ${(analysisResults.graphData?.nodes?.length || 0)}
- Critical risks: ${criticalCount}
- High risks: ${highCount}

INSTRUCTIONS:
- Answer ALL questions specifically about THIS codebase only
- Reference actual file names, module names, and risks found
- If asked about something not in the analysis, say so clearly
- Do not make up file names or modules that are not listed above
- Keep answers concise and technical
- When referencing risks, always mention their severity level`;
  };

  const trimMessages = (msgs: { role: string; content: string }[]) => {
    const systemMsgs = msgs.filter(m => m.role === 'system');
    const conversationMsgs = msgs.filter(m => m.role !== 'system');
    const trimmed = conversationMsgs.slice(-20);
    return [...systemMsgs, ...trimmed];
  };

  const systemMessage = {
    role: "system",
    content: buildSystemPrompt(analysis) + "\n\n" + CHAT_SYSTEM_PROMPT,
  };

  const conversation = [
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text })),
    { role: "user", content: newMessage }
  ];

  const messages = trimMessages([systemMessage, ...conversation]);

  // Use the robust caller
  const result = await callOpenRouter(messages as any, false);
  return result || "I couldn't generate a response.";
};

export const runExecutionSimulation = async (
  analysis: CodeAnalysisResult,
  files: FileNode[]
) => {
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
