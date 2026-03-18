
import React, { useMemo, useState } from 'react';
import { AlertCircle, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { importRepository } from '../services/githubService';

interface GitHubImporterProps {
  onImportComplete: (files: Array<{ path: string; content: string; language: string; size: number }>) => void;
  onError: (error: string) => void;
}

const GitHubImporter: React.FC<GitHubImporterProps> = ({ onImportComplete, onError }) => {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fetchSource, setFetchSource] = useState<'backend' | 'octokit' | null>(null);
  const [repoPath, setRepoPath] = useState('');
  const [focused, setFocused] = useState(false);

  const normalizedRepoPath = useMemo(() => repoPath.replace(/^github\.com\s*\/\s*/i, '').trim(), [repoPath]);

  const handleImport = async () => {
    if (!url) {
      setError("Please enter a valid GitHub URL");
      return;
    }

    setLoading(true);
    setError(null);
    setFetchSource(null);
    setStatus('Connecting...');

    try {
      const result = await importRepository(
        { url, branch, token },
        (statusUpdate) => setStatus(statusUpdate)
      );

      if (result.success && result.data) {
        setFetchSource(result.source || 'backend');
        setStatus(`✓ Imported ${result.data.files.length} files via ${result.source === 'octokit' ? 'Browser' : 'Backend'}`);

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
      setLoading(false);
      console.warn('[GitHubImporter] All fetch methods failed:', err.message);
      onError(err.message || "Failed to import. Switching to demo mode.");
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Input bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(19,17,31,0.9)',
          border: `1px solid ${focused ? 'rgba(124,58,237,0.7)' : 'rgba(124,58,237,0.3)'}`,
          borderRadius: 12,
          padding: '6px 6px 6px 16px',
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: '#4a4460',
            marginRight: 4,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono)',
          }}
        >
          github.com /
        </span>
        <input
          type="text"
          className="cs-gh-input"
          value={repoPath}
          onChange={(e) => {
            const next = e.target.value;
            setRepoPath(next);
            const path = next.replace(/^github\.com\s*\/\s*/i, '').trim().replace(/^\/+/, '');
            setUrl(path ? `https://github.com/${path}` : '');
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (!loading) handleImport();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={loading}
          placeholder="owner / repository"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={loading}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? <Loader2 size={14} className="spinner" /> : null}
          Analyze →
        </button>
      </div>

      {/* Or divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: '#2e2a45', fontSize: 11 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ whiteSpace: 'nowrap' }}>or try an example</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Examples */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['vercel/next.js', 'facebook/react', 'supabase/supabase'].map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setRepoPath(ex);
              setUrl(`https://github.com/${ex}`);
              setError(null);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'rgba(226,75,74,0.10)',
          border: '1px solid rgba(226,75,74,0.35)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'start', gap: 'var(--space-2)',
          fontSize: 12, color: 'var(--red)',
          marginTop: 12,
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Status */}
      {loading && !error && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'rgba(19,17,31,0.7)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--radius-md)',
          marginTop: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <Loader2 size={14} className="spinner" style={{ color: 'var(--purple-strong)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
          </div>
          {status.includes('Browser') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 10, color: 'var(--amber)' }}>
              <CloudOff size={12} />
              <span>Backend offline — using GitHub API directly</span>
            </div>
          )}
        </div>
      )}

      {/* Fetch Source */}
      {fetchSource && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12, color: 'var(--green)', marginTop: 12 }}>
          {fetchSource === 'backend' ? <Cloud size={14} /> : <CloudOff size={14} />}
          <span>Fetched via {fetchSource === 'backend' ? 'Backend Server' : 'Browser (Octokit)'}</span>
        </div>
      )}
    </div>
  );
};

export default GitHubImporter;
