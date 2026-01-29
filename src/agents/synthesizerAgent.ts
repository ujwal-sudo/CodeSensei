
import { callGeminiAgent, MODELS, ModelTier } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { Schema, Type } from './baseAgent';
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

/**
 * Synthesizer Agent - Uses PRO tier for highest reasoning
 * This agent merges all worker agent outputs into a final analysis report.
 * It requires more sophisticated reasoning to correlate findings.
 */
export const runSynthesizerAgent = async (agentOutputs: any): Promise<SynthesizerOutput> => {
  console.log('[Synthesizer] Using PRO tier for high-quality synthesis...');
  const context = JSON.stringify(agentOutputs, null, 2);
  // Use PRO tier for synthesizer - requires higher reasoning capabilities
  return callGeminiAgent<SynthesizerOutput>(AGENT_PROMPTS.SYNTHESIZER, context, schema, 0.1, MODELS.PRO, ModelTier.PRO);
};
