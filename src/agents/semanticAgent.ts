import { callGeminiAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from '@google/genai';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    apis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          purpose: { type: Type.STRING },
          inputs: { type: Type.STRING },
          outputs: { type: Type.STRING },
          contracts: { type: Type.STRING }
        }
      }
    },
    invariants: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          evidence: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    patterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pattern: { type: Type.STRING },
          evidence: { type: Type.STRING }
        }
      }
    }
  }
};

export interface SemanticOutput {
  apis: Array<{ name: string; purpose: string; inputs: string; outputs: string; contracts: string }>;
  invariants: Array<{ description: string; evidence: string[] }>;
  patterns: Array<{ pattern: string; evidence: string }>;
}

export const runSemanticAgent = async (chunks: CodeChunk[]): Promise<SemanticOutput> => {
  const context = chunks.slice(0, 15).map(c => `Chunk: ${c.id}\n${c.content}`).join('\n---\n');
  return callGeminiAgent<SemanticOutput>(AGENT_PROMPTS.SEMANTIC, context, schema, 0.3);
};