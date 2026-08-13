import { callGeminiAgent, MODELS, ModelTier } from './baseAgent';
import { AGENT_PROMPTS } from '../../prompts';
import { CodeChunk } from '../chunker/chunkRepo';
import { Schema, Type } from './baseAgent';

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
          responsibility: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      }
    },
    entrypoints: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ['files', 'modules', 'entrypoints']
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
    responsibility?: string;
    description: string;
  }>;
  entrypoints: string[];
}

/**
 * Structure Agent - Uses STANDARD tier (Nemotron) for high-volume tasks
 * Analyzes code structure, identifies modules and entry points.
 */
export const runStructureAgent = async (chunks: CodeChunk[]): Promise<StructureOutput> => {
  console.log('[Structure] Using STANDARD tier (Nemotron) for structure analysis...');
  // Aggregate chunk content for structure analysis (mostly file headers/imports)
  const context = chunks.filter(c => c.type === 'file').slice(0, 10).map(c => `File: ${c.filePath}\n${c.content.substring(0, 500)}...`).join('\n---\n');
  console.log('[TRACE] Structure Agent calling BaseAgent with context size:', context.length);
  const response = await callGeminiAgent<StructureOutput>(AGENT_PROMPTS.STRUCTURE, context, schema, 0.1, MODELS.STANDARD, ModelTier.STANDARD);
  
  console.log('[TRACE] Structure Agent received BaseAgent result. Validating schema...');
  
  // Guarantee arrays exist even if LLM omits them
  if (!response.modules || !Array.isArray(response.modules)) {
    console.warn('[Structure] Validation Warning: "modules" array missing. Defaulting to empty array.');
    response.modules = [];
  }
  if (!response.files || !Array.isArray(response.files)) {
    console.warn('[Structure] Validation Warning: "files" array missing. Defaulting to empty array.');
    response.files = [];
  }
  if (!response.entrypoints || !Array.isArray(response.entrypoints)) {
    console.warn('[Structure] Validation Warning: "entrypoints" array missing. Defaulting to empty array.');
    response.entrypoints = [];
  }
  
  console.log(`[TRACE] Structure Agent parsed response: ${response.modules.length} modules, ${response.files.length} files.`);
  console.log(`[TRACE] Structure Agent returning result`);
  return response;
};