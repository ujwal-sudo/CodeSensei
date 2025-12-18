import { analyzeRepository } from '../services/geminiService';
import { FileNode } from '../types';

async function main() {
  // Minimal in-memory repo with one small TS file
  const files: FileNode[] = [
    {
      path: 'example/add.ts',
      content: `export function add(a: number, b: number) {\n  return a + b;\n}\n`,
      language: 'typescript',
      size: 42
    }
  ];

  try {
    console.log('Starting example analysis (this will call the multi-agent orchestrator)...');
    const result = await analyzeRepository(files, (progress) => {
      console.log('PROGRESS:', progress);
    });

    console.log('Analysis result (summary):', result.summary);
    console.log('Architecture:', result.architecture);
    console.log('Tech stack:', result.techStack);
    console.log('Risks:', result.risks);
  } catch (e) {
    console.error('Example analysis failed:', e);
    process.exit(1);
  }
}

main();
