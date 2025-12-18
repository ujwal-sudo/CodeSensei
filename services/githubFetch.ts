import { FileNode } from '../types';

const ALLOWED_EXT = new Set(['.js', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs']);
const MAX_FILE_SIZE = 200 * 1024; // 200 KB
const MAX_TOTAL_FILES = 100;

function getExt(path: string) {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx).toLowerCase();
}

function inferLanguage(path: string) {
  const ext = getExt(path);
  switch (ext) {
    case '.ts': return 'typescript';
    case '.tsx': return 'tsx';
    case '.js': return 'javascript';
    case '.py': return 'python';
    case '.java': return 'java';
    case '.cpp': return 'cpp';
    case '.c': return 'c';
    case '.go': return 'go';
    case '.rs': return 'rust';
    default: return 'text';
  }
}

async function fetchJson(url: string, token?: string) {
  const headers: Record<string,string> = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `token ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    const err: any = new Error(`GitHub API error ${res.status}: ${errText}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchGitHubRepoFiles(repoUrl: string, token?: string, branch?: string): Promise<FileNode[]> {
  // Parse URL like https://github.com/{owner}/{repo}
  const m = repoUrl.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)(?:\/|$)/i);
  if (!m) throw new Error('Invalid GitHub URL. Use https://github.com/{owner}/{repo}');
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, '');

  const apiRoot = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const files: FileNode[] = [];

  async function walk(path = ''): Promise<void> {
    if (files.length >= MAX_TOTAL_FILES) return;
    const url = apiRoot + (path ? `/${encodeURIComponent(path)}` : '') + (branch ? `?ref=${encodeURIComponent(branch)}` : '');
    const items = await fetchJson(url, token);
    if (!Array.isArray(items)) return; // root might be a file

    for (const item of items) {
      if (files.length >= MAX_TOTAL_FILES) break;
      if (item.type === 'dir') {
        await walk(item.path);
        continue;
      }

      if (item.type !== 'file') continue;
      const ext = getExt(item.name);
      if (!ALLOWED_EXT.has(ext)) continue;
      if (typeof item.size === 'number' && item.size > MAX_FILE_SIZE) continue;

      // Fetch content via download_url (raw content)
      const downloadUrl = item.download_url;
      if (!downloadUrl) continue;

      const headers: Record<string,string> = {};
      if (token) headers['Authorization'] = `token ${token}`;
      const res = await fetch(downloadUrl, { headers });
      if (!res.ok) {
        // skip problematic file but continue
        console.warn(`Failed to download ${item.path}: ${res.status}`);
        continue;
      }
      const content = await res.text();
      files.push({ path: item.path, content, language: inferLanguage(item.name), size: content.length });
    }
  }

  try {
    await walk('');
  } catch (e: any) {
    // Rethrow with status for caller handling
    throw e;
  }

  return files;
}

export default fetchGitHubRepoFiles;
