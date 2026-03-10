
import { scheduleRobustRequest, sleep } from '../utils/rateLimiter';

// Mocking Schema and Type locally to remove @google/genai dependency
export enum Type {
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT"
}

export interface Schema {
  type?: Type;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  maxItems?: number;
  minItems?: number;
  properties?: { [key: string]: Schema };
  required?: string[];
  items?: Schema;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Multi-Key Tiered Intelligence Model Configuration
 * 
 * Using openai/gpt-oss-120b:free for all tasks
 * This is a free model with good reasoning capabilities
 */
export const MODELS = {
  // High-volume tasks: Use Nemotron (fast & cheap)
  STANDARD: "nvidia/nemotron-3-nano-30b-a3b:free",
  // Mid-tier tasks: Use Nemotron (fast & cheap) - mapping FLASH to Nemotron as well to save OpenAI for complex tasks
  FLASH: "nvidia/nemotron-3-nano-30b-a3b:free",
  // High-reasoning tasks: Use Nemotron (same model, data policy compatible)
  PRO: "nvidia/nemotron-3-nano-30b-a3b:free"
};

// Model tiers for automatic key selection
export enum ModelTier {
  STANDARD = "STANDARD",  // High-volume, uses API_KEY_2 (Nemotron)
  FLASH = "FLASH",        // Quality workers, uses API_KEY (Flash)
  PRO = "PRO"             // High-reasoning, uses API_KEY (Pro)
}

const DEFAULT_MODEL = MODELS.STANDARD;
const DEFAULT_TIER = ModelTier.STANDARD;

/**
 * Get the appropriate API key based on model tier
 * PRO/FLASH tiers use the primary key, STANDARD uses the secondary key
 */
function getApiKeyForTier(tier: ModelTier): string {
  const primaryKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const secondaryKey = process.env.OPENROUTER_API_KEY_2;

  switch (tier) {
    case ModelTier.PRO:
    case ModelTier.FLASH:
      // Use primary key for high-reasoning tasks
      if (!primaryKey) {
        console.warn('[Multi-Key] Primary API key missing, falling back to secondary');
        if (!secondaryKey) throw new Error("No API keys configured");
        return secondaryKey;
      }
      return primaryKey;

    case ModelTier.STANDARD:
    default:
      // Use secondary key (Nemotron) for high-volume tasks
      if (!secondaryKey) {
        console.warn('[Multi-Key] Secondary API key missing, falling back to primary');
        if (!primaryKey) throw new Error("No API keys configured");
        return primaryKey;
      }
      return secondaryKey;
  }
}

/**
 * Determine model tier from model name
 */
function getModelTier(model: string): ModelTier {
  if (model.includes('pro') || model.includes('Pro')) {
    return ModelTier.PRO;
  }
  if (model.includes('flash') || model.includes('Flash')) {
    return ModelTier.FLASH;
  }
  return ModelTier.STANDARD;
}

function cleanJson(text: string): string {
  // Remove markdown code blocks if present (```json ... ```)
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  // Trim whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

function repairTruncatedJson(jsonStr: string): string {
  // This is a heuristic to save valuable data if the token limit cuts off the JSON.

  // 1. Remove trailing backslash if present (escaped quote cut off)
  if (jsonStr.endsWith('\\')) {
    jsonStr = jsonStr.slice(0, -1);
  }

  // 2. Handle dangling string literals
  // Count unescaped quotes. If odd, we are likely inside a string.
  const quoteCount = (jsonStr.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    jsonStr += '"';
  }

  // 3. Balance Brackets/Braces
  const stack: string[] = [];
  let inString = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    // Toggle string state on unescaped quote
    if (char === '"' && (i === 0 || jsonStr[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') stack.push('}');
    else if (char === '[') stack.push(']');
    else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }

  // Close remaining open structures in reverse order
  while (stack.length > 0) {
    jsonStr += stack.pop();
  }

  return jsonStr;
}

/**
 * Calls an AI agent with the given prompt and schema.
 * Uses Multi-Key Tiered Intelligence for cost optimization.
 * 
 * @param systemPrompt - The system prompt for the agent
 * @param userContext - The user context/data to analyze
 * @param responseSchema - The expected JSON schema for the response
 * @param temperature - The temperature for generation (default: 0.2)
 * @param modelOverride - Optional model override (use MODELS.PRO for synthesizer)
 * @param tierOverride - Optional tier override for explicit key selection
 */
export async function callGeminiAgent<T>(
  systemPrompt: string,
  userContext: string,
  responseSchema: Schema,
  temperature: number = 0.2,
  modelOverride?: string,
  tierOverride?: ModelTier
): Promise<T> {
  // Determine model
  const model = modelOverride || DEFAULT_MODEL;

  // Serialize schema for the prompt
  const schemaStr = JSON.stringify(responseSchema, null, 2);
  const prompt = `${systemPrompt}

You must respond with valid JSON matching this schema:
${schemaStr}

DATA CONTEXT:
${userContext}`;

  // Use Robust Request Scheduler
  return scheduleRobustRequest(async (apiKey) => {
    console.log(`[BaseAgent] Making robust request with model ${model}...`);

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://codesensei.ai",
        "X-Title": "CodeSensei",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "You are a code analysis agent. Output valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: temperature,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      // Throwing error allows scheduleRobustRequest to handle 429/503 retries with new keys
      throw new Error(`OpenRouter API Error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (content) {
      const cleanedText = cleanJson(content);
      try {
        return JSON.parse(cleanedText) as T;
      } catch (parseError) {
        console.warn("JSON Parse Error. Attempting repair on truncated JSON...");
        try {
          const repairedText = repairTruncatedJson(cleanedText);
          return JSON.parse(repairedText) as T;
        } catch (repairError) {
          console.error("Critical: Failed to parse JSON even after repair.", content.slice(-100));
          throw new Error("Agent response was malformed.");
        }
      }
    }
    throw new Error("Agent returned empty response");
  });
}

/**
 * Convenience function for high-volume tasks (Structure, Behavior, Semantic, Risk)
 * Uses STANDARD tier with Nemotron model
 */
export async function callStandardAgent<T>(
  systemPrompt: string,
  userContext: string,
  responseSchema: Schema,
  temperature: number = 0.2
): Promise<T> {
  return callGeminiAgent<T>(
    systemPrompt, userContext, responseSchema, temperature,
    MODELS.STANDARD, ModelTier.STANDARD
  );
}

/**
 * Convenience function for quality worker tasks
 * Uses FLASH tier with Gemini Flash model
 */
export async function callFlashAgent<T>(
  systemPrompt: string,
  userContext: string,
  responseSchema: Schema,
  temperature: number = 0.2
): Promise<T> {
  return callGeminiAgent<T>(
    systemPrompt, userContext, responseSchema, temperature,
    MODELS.FLASH, ModelTier.FLASH
  );
}

/**
 * Convenience function for high-reasoning tasks (Synthesizer, Execution)
 * Uses PRO tier with Gemini Pro model
 */
export async function callProAgent<T>(
  systemPrompt: string,
  userContext: string,
  responseSchema: Schema,
  temperature: number = 0.2
): Promise<T> {
  return callGeminiAgent<T>(
    systemPrompt, userContext, responseSchema, temperature,
    MODELS.PRO, ModelTier.PRO
  );
}