import { callGeminiAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from '@google/genai';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    call_graph: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          type: { type: Type.STRING }
        }
      }
    },
    side_effects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          type: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      }
    },
    global_state: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          defined_in: { type: Type.STRING },
          mutated_in: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  }
};

export interface BehaviorOutput {
  call_graph: Array<{ from: string; to: string; type: string }>;
  side_effects: Array<{ location: string; type: string; description: string }>;
  global_state: Array<{ name: string; defined_in: string; mutated_in: string[] }>;
}

export const runBehaviorAgent = async (chunks: CodeChunk[]): Promise<BehaviorOutput> => {
  // Behavior needs logic bodies
  const context = chunks.slice(0, 15).map(c => `Block: ${c.id}\n${c.content}`).join('\n---\n');
  return callGeminiAgent<BehaviorOutput>(AGENT_PROMPTS.BEHAVIOR, context, schema, 0.2);
};