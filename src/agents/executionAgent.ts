import { runAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from '@google/genai';

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

export const runExecutionAgent = async (chunks: CodeChunk[], structureSummary: string): Promise<ExecutionOutput> => {
  const context = `
    STRUCTURE SUMMARY: ${structureSummary}
    CODE CONTEXT:
    ${chunks.slice(0, 10).map(c => c.content).join('\n')}
  `;
  return runAgent<ExecutionOutput>(AGENT_PROMPTS.EXECUTION, context, undefined, schema);
};