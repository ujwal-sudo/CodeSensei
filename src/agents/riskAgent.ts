import { callGeminiAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from '@google/genai';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    risks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          severity: { type: Type.STRING },
          location: { type: Type.STRING },
          description: { type: Type.STRING },
          why: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          mitigation: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  }
};

export interface RiskOutput {
  risks: Array<{
    id: string;
    severity: string;
    location: string;
    description: string;
    why: string;
    confidence: number;
    mitigation: string[];
  }>;
}

export const runRiskAgent = async (chunks: CodeChunk[]): Promise<RiskOutput> => {
  const context = chunks.map(c => `File: ${c.filePath}\n${c.content}`).join('\n---\n');
  return callGeminiAgent<RiskOutput>(AGENT_PROMPTS.RISK, context, schema, 0.2);
};