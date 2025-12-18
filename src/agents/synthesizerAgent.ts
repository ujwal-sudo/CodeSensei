
import { runAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { Schema, Type } from '@google/genai';
import { GraphData } from '../../types';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    architecture: { type: Type.STRING },
    techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
    graphData: {
      type: Type.OBJECT,
      properties: {
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              group: { type: Type.STRING },
              val: { type: Type.NUMBER },
              details: { type: Type.STRING },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        links: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              type: { type: Type.STRING }
            }
          }
        }
      }
    }
  }
};

export interface SynthesizerOutput {
  summary: string;
  architecture: string;
  techStack: string[];
  graphData: GraphData;
}

export const runSynthesizerAgent = async (agentOutputs: any): Promise<SynthesizerOutput> => {
  const context = JSON.stringify(agentOutputs, null, 2);
  return runAgent<SynthesizerOutput>(AGENT_PROMPTS.SYNTHESIZER, context, undefined, schema);
};
