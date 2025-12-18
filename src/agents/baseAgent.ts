
import { GoogleGenerativeAI, Schema } from "@google/genai";

// Support both Vite `import.meta.env.VITE_GEMINI_API_KEY` and Node `process.env.API_KEY`.
const apiKeyFromVite = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY;
const API_KEY = apiKeyFromVite || process.env.API_KEY;
if (!API_KEY) throw new Error('Gemini API key missing: set VITE_GEMINI_API_KEY or API_KEY');

const genAI = new GoogleGenerativeAI(API_KEY as string);

export async function runAgent<T>(
  systemPrompt: string,
  userInput: string,
  model = "gemini-3-pro-preview"
  , responseSchema?: Schema
): Promise<T> {
  function cleanJson(text: string): string {
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
    return cleaned.trim();
  }

  function repairTruncatedJson(jsonStr: string): string {
    if (jsonStr.endsWith('\\')) jsonStr = jsonStr.slice(0, -1);
    const quoteCount = (jsonStr.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) jsonStr += '"';

    const stack: string[] = [];
    let inString = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (char === '"' && (i === 0 || jsonStr[i-1] !== '\\')) {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
      }
    }
    while (stack.length > 0) jsonStr += stack.pop();
    return jsonStr;
  }

  const generationConfig: any = {
    temperature: 0,
    responseMimeType: "application/json"
  };
  if (responseSchema) generationConfig.responseSchema = responseSchema;

  const modelInstance = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig
  });

  const result = await modelInstance.generateContent(userInput);
  const text = result.response?.text?.() ?? (result as any).responseText ?? '';

  const cleaned = cleanJson(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    if (responseSchema) {
      // Try a best-effort repair when schema was provided
      const repaired = repairTruncatedJson(cleaned);
      try {
        return JSON.parse(repaired) as T;
      } catch (e2) {
        throw new Error(`Agent JSON parse failed after repair:\n${text}`);
      }
    }
    throw new Error(`Agent JSON parse failed:\n${text}`);
  }
}