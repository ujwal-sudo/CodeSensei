
import { Octokit } from '@octokit/rest';

export interface ImportRepoRequest {
  url: string;
  branch?: string;
  token?: string;
}

export interface ImportRepoResponse {
  success: boolean;
  data?: {
    repo: string;
    branch: string;
    files: Array<{
      path: string;
      language: string;
      size: number;
      content: string;
    }>;
  };
  error?: string;
  source?: 'backend' | 'octokit'; // Track which method succeeded
}

// Parse GitHub URL to extract owner and repo
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Handle various GitHub URL formats
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,
      /github\.com:([^\/]+)\/([^\/\.]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Get language from file extension
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'vue': 'vue',
    'svelte': 'svelte',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sql': 'sql',
  };
  return langMap[ext] || 'text';
}

// Check if file should be included in analysis
function shouldIncludeFile(path: string): boolean {
  // Skip common non-code files and directories
  const excludePatterns = [
    'node_modules/',
    'dist/',
    'build/',
    '.git/',
    '__pycache__/',
    '.idea/',
    '.vscode/',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot',
    '.zip', '.tar', '.gz',
    '.pdf', '.doc', '.docx',
  ];

  const lowerPath = path.toLowerCase();
  return !excludePatterns.some(p => lowerPath.includes(p));
}

// Fallback: Fetch repository using Octokit (client-side)
async function fetchViaOctokit(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
  onStatus?: (status: string) => void
): Promise<ImportRepoResponse> {
  try {
    const octokit = new Octokit({
      auth: token || undefined
    });

    onStatus?.('Fetching repository structure...');

    // Get the default branch if not specified
    let targetBranch = branch;
    if (!targetBranch) {
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      targetBranch = repoData.default_branch;
    }

    // Get the file tree
    onStatus?.(`Fetching file tree from ${targetBranch}...`);
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: targetBranch,
      recursive: 'true'
    });

    // Filter to only include code files
    const codeFiles = treeData.tree.filter(item =>
      item.type === 'blob' &&
      item.path &&
      shouldIncludeFile(item.path) &&
      (item.size || 0) < 100000 // Skip files > 100KB
    );

    // Limit to first 50 files to avoid rate limits
    const filesToFetch = codeFiles.slice(0, 50);

    onStatus?.(`Fetching ${filesToFetch.length} files...`);

    // Fetch file contents in batches to avoid rate limits
    const files: ImportRepoResponse['data']['files'] = [];
    const batchSize = 5;

    for (let i = 0; i < filesToFetch.length; i += batchSize) {
      const batch = filesToFetch.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const { data } = await octokit.repos.getContent({
              owner,
              repo,
              path: file.path!,
              ref: targetBranch
            });

            if ('content' in data && data.type === 'file') {
              // Content is base64 encoded
              const content = atob(data.content.replace(/\n/g, ''));
              return {
                path: file.path!,
                language: getLanguageFromPath(file.path!),
                size: file.size || 0,
                content
              };
            }
            return null;
          } catch {
            return null; // Skip files that fail
          }
        })
      );

      files.push(...batchResults.filter(Boolean) as any);
      onStatus?.(`Fetched ${files.length}/${filesToFetch.length} files...`);

      // Small delay between batches to be nice to GitHub API
      if (i + batchSize < filesToFetch.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (files.length === 0) {
      return { success: false, error: 'No code files found in repository' };
    }

    return {
      success: true,
      source: 'octokit',
      data: {
        repo: `${owner}/${repo}`,
        branch: targetBranch,
        files
      }
    };

  } catch (error: any) {
    console.error('[Octokit] Error:', error);

    if (error.status === 404) {
      return { success: false, error: 'Repository not found. Make sure it exists and is public.' };
    }
    if (error.status === 403) {
      return { success: false, error: 'Rate limited. Please wait a moment or provide a GitHub token.' };
    }
    if (error.status === 401) {
      return { success: false, error: 'Invalid GitHub token.' };
    }

    return { success: false, error: error.message || 'Failed to fetch via GitHub API' };
  }
}

// Main import function with 3-tier fallback
export const importRepository = async (
  request: ImportRepoRequest,
  onStatus?: (status: string) => void
): Promise<ImportRepoResponse> => {
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002';

  // ============ TIER 1: Try Backend API ============
  try {
    onStatus?.('Connecting to backend server...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for backend

    const response = await fetch(`${backendUrl}/api/github/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.success) {
      console.log('[GitHub Import] Success via backend');
      return { ...data, source: 'backend' };
    }

    // Backend returned error - fall through to Octokit
    console.log('[GitHub Import] Backend returned error, trying Octokit...');

  } catch (error: any) {
    // Network error or timeout - fall through to Octokit
    console.log('[GitHub Import] Backend unavailable, trying Octokit fallback...');
  }

  // ============ TIER 2: Try Octokit (Client-Side) ============
  const parsed = parseGitHubUrl(request.url);

  if (!parsed) {
    return { success: false, error: 'Invalid GitHub URL format' };
  }

  onStatus?.('Backend offline. Fetching via browser...');

  const octokitResult = await fetchViaOctokit(
    parsed.owner,
    parsed.repo,
    request.branch || '',
    request.token,
    onStatus
  );

  if (octokitResult.success) {
    console.log('[GitHub Import] Success via Octokit');
    return octokitResult;
  }

  // ============ TIER 3: Both Failed ============
  console.error('[GitHub Import] Both backend and Octokit failed');

  // Throw special error to trigger demo mode
  throw new Error(`Import failed: ${octokitResult.error}. Switching to demo mode.`);
};
