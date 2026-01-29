import { callGeminiAgent, MODELS, ModelTier } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from './baseAgent';

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

/**
 * Behavior Agent - Uses STANDARD tier (Nemotron) for high-volume tasks
 * Analyzes call graphs, side effects, and global state mutations.
 */
export const runBehaviorAgent = async (chunks: CodeChunk[]): Promise<BehaviorOutput> => {
  console.log('[Behavior] Using STANDARD tier (Nemotron) for behavior analysis...');
  // Behavior needs logic bodies
  const context = chunks.slice(0, 15).map(c => `Block: ${c.id}\n${c.content}`).join('\n---\n');
  return callGeminiAgent<BehaviorOutput>(AGENT_PROMPTS.BEHAVIOR, context, schema, 0.2, MODELS.STANDARD, ModelTier.STANDARD);
};