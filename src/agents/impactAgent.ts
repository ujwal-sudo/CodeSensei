import { callGeminiAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from '@google/genai';
import { CodeAnalysisResult, ImpactPrediction } from '../../types';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    change: { type: Type.STRING },
    affected: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          file: { type: Type.STRING },
          why: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        }
      }
    },
    tests_likely_to_break: { type: Type.ARRAY, items: { type: Type.STRING } },
    severity_estimate: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
    recommended_mitigations: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

export const runImpactAgent = async (
  proposedChange: string, 
  analysis: CodeAnalysisResult, 
  chunks: CodeChunk[]
): Promise<ImpactPrediction> => {
  const context = `
    CURRENT ARCHITECTURE: ${analysis.architecture}
    PROPOSED CHANGE: ${proposedChange}
    CODE CONTEXT:
    ${chunks.slice(0, 10).map(c => c.content).join('\n')}
  `;
  
  // Mapping output to match internal ImpactPrediction type (camelCase vs snake_case in schema)
  const raw = await callGeminiAgent<any>(AGENT_PROMPTS.IMPACT, context, schema, 0.2);
  
  return {
    change: raw.change,
    affected: raw.affected,
    testsLikelyToBreak: raw.tests_likely_to_break,
    severityEstimate: raw.severity_estimate,
    recommendedMitigations: raw.recommended_mitigations
  };
};