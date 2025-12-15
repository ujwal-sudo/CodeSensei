
import { GoogleGenAI, Schema } from "@google/genai";

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
    if (char === '"' && (i === 0 || jsonStr[i-1] !== '\\')) {
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

export async function callGeminiAgent<T>(
  systemPrompt: string,
  userContext: string,
  responseSchema: Schema,
  temperature: number = 0.2
): Promise<T> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey });
  
  // Switch to gemini-3-pro-preview for better adherence to schema and handling large outputs without truncation errors
  const modelId = 'gemini-3-pro-preview'; 

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${systemPrompt}\n\nDATA CONTEXT:\n${userContext}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: temperature,
      }
    });

    if (response.text) {
      const cleanedText = cleanJson(response.text);
      try {
        return JSON.parse(cleanedText) as T;
      } catch (parseError) {
        console.warn("JSON Parse Error. Attempting repair on truncated JSON...");
        try {
          const repairedText = repairTruncatedJson(cleanedText);
          return JSON.parse(repairedText) as T;
        } catch (repairError) {
          console.error("Critical: Failed to parse JSON even after repair.", response.text.slice(-100));
          throw new Error("Agent response was malformed.");
        }
      }
    }
    throw new Error("Agent returned empty response");
  } catch (e) {
    console.error(`Agent Error (${modelId}):`, e);
    throw e;
  }
}