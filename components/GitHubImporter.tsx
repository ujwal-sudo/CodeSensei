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

  const handleImport = async (overrideUrl?: string) => {
    const targetUrl = typeof overrideUrl === 'string' ? overrideUrl : url;
    if (!targetUrl) {
      setError("Please enter a valid GitHub URL");
      return;
    }

    setLoading(true);
    setError(null);
    setFetchSource(null);
    setStatus('Connecting...');

    try {
      const result = await importRepository(
        { url: targetUrl, branch, token },
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
          background: 'var(--surface-container-high)',
          border: `1px solid ${focused ? '#b7f34a' : '#434936'}`,
          borderRadius: 12,
          padding: '6px 6px 6px 16px',
          boxShadow: focused ? '0 0 0 3px rgba(183,243,74,0.1)' : 'none',
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
            color: '#e2e3e0',
            fontFamily: 'monospace',
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
            background: '#b7f34a',
            color: '#233600',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: '#c3c9b0', fontSize: 11 }}>
        <div style={{ flex: 1, height: 1, background: '#434936' }} />
        <div style={{ whiteSpace: 'nowrap' }}>or try an example</div>
        <div style={{ flex: 1, height: 1, background: '#434936' }} />
      </div>

      {/* Examples */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['ujwal-sudo/CodeSensei', 'ujwal-sudo/TalkToWeb'].map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              const newUrl = `https://github.com/${ex}`;
              setRepoPath(ex);
              setUrl(newUrl);
              setError(null);
              handleImport(newUrl);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              background: '#1a1c1b',
              border: '1px solid #434936',
              color: '#c3c9b0',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#93000a',
          border: '1px solid #ffb4ab',
          borderRadius: '6px',
          display: 'flex', alignItems: 'start', gap: '8px',
          fontSize: 12, color: '#ffdad6',
          marginTop: 12,
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Status */}
      {loading && !error && (
        <div style={{
          padding: '12px',
          background: '#1e201f',
          border: '1px solid #434936',
          borderRadius: '6px',
          marginTop: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: 12 }}>
            <Loader2 size={14} className="spinner" style={{ color: '#b7f34a' }} />
            <span style={{ color: '#e2e3e0' }}>{status}</span>
          </div>
          {status.includes('Browser') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: 10, color: '#ffb4ab' }}>
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
