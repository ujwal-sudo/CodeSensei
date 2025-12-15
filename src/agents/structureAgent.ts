import { callGeminiAgent } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from '@google/genai';

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          language: { type: Type.STRING },
          summary: { type: Type.STRING },
          exports: { type: Type.ARRAY, items: { type: Type.STRING } },
          imports: { type: Type.ARRAY, items: { type: Type.STRING } },
          size_lines: { type: Type.NUMBER }
        }
      }
    },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          files: { type: Type.ARRAY, items: { type: Type.STRING } },
          responsibility: { type: Type.STRING }
        }
      }
    },
    entrypoints: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

export interface StructureOutput {
  files: Array<{
    path: string;
    language: string;
    summary: string;
    exports: string[];
    imports: string[];
    size_lines: number;
  }>;
  modules: Array<{
    name: string;
    files: string[];
    responsibility: string;
  }>;
  entrypoints: string[];
}

export const runStructureAgent = async (chunks: CodeChunk[]): Promise<StructureOutput> => {
  // Aggregate chunk content for structure analysis (mostly file headers/imports)
  const context = chunks.filter(c => c.type === 'file').map(c => `File: ${c.filePath}\n${c.content.substring(0, 2000)}...`).join('\n---\n');
  return callGeminiAgent<StructureOutput>(AGENT_PROMPTS.STRUCTURE, context, schema, 0.1);
};