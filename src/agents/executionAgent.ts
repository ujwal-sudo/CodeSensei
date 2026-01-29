import { callGeminiAgent, MODELS, ModelTier } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from './baseAgent';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.NUMBER },
          desc: { type: Type.STRING },
          files: { type: Type.ARRAY, items: { type: Type.STRING } },
          approx_time_ms: { type: Type.NUMBER },
          location: { type: Type.STRING },
          action: { type: Type.STRING },
          stateChanges: { type: Type.STRING },
          narrative: { type: Type.STRING }
        }
      }
    },
    visual_script: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          frame: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  }
};

export interface ExecutionOutput {
  steps: Array<{
    step: number;
    desc: string;
    files: string[];
    approx_time_ms: number;
    location: string;
    action: string;
    stateChanges: string;
    narrative: string;
  }>;
  visual_script: any[];
}

/**
 * Execution Agent - Uses FLASH tier for quality execution flow tracing
 * Traces code execution paths and generates step-by-step narratives.
 */
export const runExecutionAgent = async (chunks: CodeChunk[], structureSummary: string): Promise<ExecutionOutput> => {
  console.log('[Execution] Using FLASH model for execution flow analysis...');
  const context = `
    STRUCTURE SUMMARY: ${structureSummary}
    CODE CONTEXT:
    ${chunks.slice(0, 10).map(c => c.content).join('\n')}
  `;
  // Use PRO tier for quality execution analysis - reasoning required
  return callGeminiAgent<ExecutionOutput>(AGENT_PROMPTS.EXECUTION, context, schema, 0.4, MODELS.PRO, ModelTier.PRO);
};