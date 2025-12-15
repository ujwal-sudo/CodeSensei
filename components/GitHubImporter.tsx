
import React, { useState } from 'react';
import { Github, Download, AlertCircle, CheckCircle, Loader2, Key } from 'lucide-react';
import { GlassPanel, NeonButton } from './ui';
import { importRepository } from '../services/githubService';

interface GitHubImporterProps {
  onImportComplete: (files: Array<{path: string; content: string; language: string; size: number}>) => void;
  onError: (error: string) => void;
}

const GitHubImporter: React.FC<GitHubImporterProps> = ({ onImportComplete, onError }) => {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url) {
      setError("Please enter a valid GitHub URL");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Connecting to GitHub...');

    try {
      const result = await importRepository({ url, branch, token });

      if (result.success && result.data) {
        setStatus(`Successfully imported ${result.data.files.length} files.`);
        
        // Short delay to show success message before transition
        setTimeout(() => {
          if (result.data) {
             onImportComplete(result.data.files);
          }
        }, 1000);
      } else {
        setError(result.error || "Import failed");
        setLoading(false);
      }

    } catch (err: any) {
      // Handle the "Backend unavailable" throw from service
      setLoading(false);
      onError("Backend service unavailable. Switching to offline demo mode.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Github className="h-5 w-5 text-slate-500" />
        </div>
        <input
          type="text"
          className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
          placeholder="Branch (default: main)"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          disabled={loading}
        />
        <div className="relative flex-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Key className="h-4 w-4 text-slate-500" />
           </div>
           <input
            type="password"
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
            placeholder="Token (Optional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs text-red-200">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center gap-2 text-xs text-cyan-400 font-mono animate-pulse">
          <Loader2 size={14} className="animate-spin" />
          {status}
        </div>
      )}

      <NeonButton 
        onClick={handleImport} 
        loading={loading}
        variant="purple"
        className="w-full"
        icon={Download}
      >
        Import Repository
      </NeonButton>
    </div>
  );
};

export default GitHubImporter;
