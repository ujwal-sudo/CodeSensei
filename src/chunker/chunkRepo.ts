import { FileNode } from '../../types';

export interface CodeChunk {
  id: string;
  filePath: string;
  type: 'file' | 'function' | 'class' | 'block';
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * intelligently splits repository files into manageable chunks for the LLM.
 * For a frontend demo, we use regex-based heuristic splitting to avoid heavy AST parsers.
 */
export const chunkRepository = (files: FileNode[]): CodeChunk[] => {
  const chunks: CodeChunk[] = [];

  files.forEach((file) => {
    // 1. Always create a full file summary chunk
    chunks.push({
      id: `${file.path}:full`,
      filePath: file.path,
      type: 'file',
      content: file.content,
      startLine: 1,
      endLine: file.content.split('\n').length
    });

    // 2. If file is large (> 50 lines), try to split by function/class
    const lines = file.content.split('\n');
    if (lines.length > 50 && (file.language === 'ts' || file.language === 'js' || file.language === 'tsx')) {
      let currentChunk: string[] = [];
      let startLine = 1;
      let bracketBalance = 0;
      let inBlock = false;

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        
        // Very basic heuristic for start of function/class
        if (!inBlock && (trimmed.startsWith('export') || trimmed.startsWith('function') || trimmed.startsWith('class') || trimmed.startsWith('const'))) {
            if (currentChunk.length > 0) {
                 // Push previous context if it exists (imports, etc)
                 // simple skip for now to focus on major blocks
                 currentChunk = [];
            }
            inBlock = true;
            startLine = lineNum;
        }

        if (inBlock) {
          currentChunk.push(line);
          bracketBalance += (line.match(/{/g) || []).length;
          bracketBalance -= (line.match(/}/g) || []).length;

          if (bracketBalance === 0 && currentChunk.length > 0) {
             // Block finished
             chunks.push({
               id: `${file.path}:${startLine}-${lineNum}`,
               filePath: file.path,
               type: 'block',
               content: currentChunk.join('\n'),
               startLine: startLine,
               endLine: lineNum
             });
             currentChunk = [];
             inBlock = false;
          }
        }
      });
    }
  });

  return chunks;
};