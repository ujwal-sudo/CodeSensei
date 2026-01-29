
import { FileNode, FileSummary, CodeAnalysisResult, AnalysisProgress, GraphNode, GraphLink, RiskItem } from "../types";
import { MAP_FILE_SYSTEM_PROMPT, REDUCE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } from "../prompts";
import { runImpactAgent } from '../src/agents/impactAgent';
import { chunkRepository } from '../src/chunker/chunkRepo';
import { sleep } from '../src/utils/rateLimiter';

// --- Constants ---
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Using openai/gpt-oss-120b:free for complex chat/analysis tasks
const MODEL_NAME = "openai/gpt-oss-120b:free"; // Matches PRO tier logic

// --- Helper: OpenRouter API Call ---
// Rate limiting configuration
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 3000;
const BACKOFF_MULTIPLIER = 2;
const REQUEST_DELAY_MS = 3000;

// Track last request time for rate limiting
let lastRequestTime = 0;

async function callOpenRouter(
  messages: { role: string; content: string }[],
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables (OPENROUTER_API_KEY).");
  }

  const body: any = {
    model: MODEL_NAME,
    messages: messages,
    temperature: jsonMode ? 0.1 : 0.7,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  // Enforce minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    console.log(`[GeminiService] Waiting ${waitTime}ms before next request...`);
    await sleep(waitTime);
  }
  lastRequestTime = Date.now();

  // Retry logic with exponential backoff
  let lastError: Error | null = null;
  let backoffMs = INITIAL_BACKOFF_MS;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      console.log(`[GeminiService] API request attempt ${attempt}...`);

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

        // Check for rate limit error
        if (response.status === 429 && attempt <= MAX_RETRIES) {
          console.warn(`[GeminiService] Rate limit hit (attempt ${attempt}/${MAX_RETRIES + 1}). Backing off for ${backoffMs}ms...`);
          await sleep(backoffMs);
          backoffMs *= BACKOFF_MULTIPLIER;
          lastError = error;
          continue;
        }

        throw error;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimitError =
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('Rate Limit');

      if (isRateLimitError && attempt <= MAX_RETRIES) {
        console.warn(`[GeminiService] Rate limit error (attempt ${attempt}/${MAX_RETRIES + 1}). Backing off for ${backoffMs}ms...`);
        await sleep(backoffMs);
        backoffMs *= BACKOFF_MULTIPLIER;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// --- JSON Schemas for Prompting ---
// Since we are moving away from Gemini's SDK schema, we provide checking or schema description in prompts if needed.
// The system prompts in ../prompts.ts are reasonably descriptive, but we can augment them.

// Simple concurrency limiter
async function asyncPool<T>(poolLimit: number, items: any[], iteratorFn: (item: any) => Promise<T>): Promise<T[]> {
  const ret: Promise<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (poolLimit <= items.length) {
      const e: Promise<void> = p.then(() => {
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

  // 1. MAP PHASE: Analyze individual files
  onProgress({ stage: 'mapping', currentFile: 0, totalFiles: files.length, currentFileName: '', message: 'Initializing analysis...' });

  let processedCount = 0;

  const mapFile = async (file: FileNode): Promise<FileSummary | null> => {
    try {
      if (file.size > 100000) return null; // Skip large files

      processedCount++;
      onProgress({
        stage: 'mapping',
        currentFile: processedCount,
        totalFiles: files.length,
        currentFileName: file.path,
        message: `Analyzing structure: ${file.path}`
      });

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
${file.content.slice(0, 8000)}
`;

      const content = await callOpenRouter([
        { role: "system", content: "You are a code analysis tool. valid JSON output only." },
        { role: "user", content: prompt }
      ], true);

      if (!content) return null;
      return JSON.parse(content) as FileSummary;
    } catch (e) {
      console.warn(`Failed to analyze file ${file.path}`, e);
      return null;
    }
  };

  // Run Map phase with concurrency limit of 1 (sequential) for free tier rate limits
  console.log('[GeminiService] Processing files sequentially to avoid rate limits...');
  const fileSummaries = (await asyncPool(1, files, mapFile)).filter(Boolean) as FileSummary[];

  // 2. REDUCE PHASE: Synthesize Architecture
  onProgress({
    stage: 'reducing',
    currentFile: files.length,
    totalFiles: files.length,
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

  const reduceContent = await callOpenRouter([
    { role: "system", content: "You are a principal software architect. valid JSON output only." },
    { role: "user", content: reducePrompt }
  ], true);

  if (!reduceContent) throw new Error("Failed to generate synthesis report.");

  const result = JSON.parse(reduceContent) as CodeAnalysisResult;
  result.executionFlow = [];

  onProgress({ stage: 'complete', currentFile: files.length, totalFiles: files.length, currentFileName: '', message: 'Analysis Complete.' });
  return result;
};

export const chatWithContext = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string,
  analysis: CodeAnalysisResult
): Promise<string> => {

  const context = `
    SUMMARY: ${analysis.summary}
    TECH STACK: ${analysis.techStack.join(', ')}
    KEY RISKS: ${analysis.risks.map(r => r.title).join(', ')}
  `;

  const messages = [
    { role: "system", content: CHAT_SYSTEM_PROMPT + "\nCONTEXT:\n" + context },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text })),
    { role: "user", content: newMessage }
  ];

  const result = await callOpenRouter(messages as any, false);
  return result || "I couldn't generate a response.";
};

export const runExecutionSimulation = async (
  analysis: CodeAnalysisResult,
  files: FileNode[]
) => {
  // Placeholder for execution simulation
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

