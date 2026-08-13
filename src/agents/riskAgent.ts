import { callGeminiAgent, MODELS, ModelTier } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from './baseAgent';

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

/**
 * Risk Agent - Uses PRO tier (OpenAI 120b) for deep security analysis
 * Identifies security vulnerabilities, code smells, and risk factors.
 */
export const runRiskAgent = async (chunks: CodeChunk[]): Promise<RiskOutput> => {
  console.log('[Risk] Using PRO tier (OpenAI) for risk analysis...');
  const context = chunks.slice(0, 15).map(c => `File: ${c.filePath}\n${c.content}`).join('\n---\n');
  const response = await callGeminiAgent<RiskOutput>(AGENT_PROMPTS.RISK, context, schema, 0.2, MODELS.PRO, ModelTier.PRO);
  if (!response.risks || !Array.isArray(response.risks)) {
    response.risks = [];
  }
  return response;
};