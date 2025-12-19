import React, { useCallback, useRef } from 'react';
import { UploadCloud, GitHub } from 'lucide-react';
import GitHubImporter from './GitHubImporter';
import { FileNode } from '../types';

type Props = {
  onFilesLoaded: (files: FileNode[]) => void;
  onImportGithub?: () => void;
  onUploadLocalClick?: () => void;
};

export default function ProjectUpload({ onFilesLoaded, onImportGithub, onUploadLocalClick }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileList = Array.from(e.target.files as FileList);
    const codeFiles = fileList.filter(f => !f.name.startsWith('.') && !f.name.endsWith('.png') && !f.name.endsWith('.jpg'));
    const processed = await Promise.all(codeFiles.map(async (f) => ({
      path: (f as any).webkitRelativePath || f.name,
      content: await f.text(),
      language: f.name.split('.').pop() || 'text',
      size: f.size
    })));
    onFilesLoaded(processed as FileNode[]);
  }, [onFilesLoaded]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center gap-6 bg-slate-900">
          <div className="p-6 rounded-full bg-slate-800/40">
            <UploadCloud size={36} className="text-cyan-400" />
          </div>
          <h3 className="text-2xl font-bold">Upload a project</h3>
          <p className="text-slate-400">Import a repository from GitHub or upload a local folder to begin analysis.</p>

          <div className="flex gap-3 mt-4">
            <button onClick={onImportGithub} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 rounded font-semibold text-black">
              <GitHub size={16} /> Import from GitHub
            </button>

            <div>
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-slate-700 rounded text-sm hover:bg-slate-800/40">Upload Local Folder</button>
              <input ref={fileInputRef} onChange={onFiles} type="file" webkitdirectory="true" directory="true" multiple className="hidden" />
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-500 text-center">No marketing text — just tools. Upload to get started.</div>
      </div>
    </div>
  );
}
