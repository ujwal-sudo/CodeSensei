
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { Buffer } from "buffer";

dotenv.config();

// Configuration limits
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const TRUNCATE_LIMIT = 100000;    // 100k chars
const RELEVANT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb', '.php', 
  '.c', '.cpp', '.h', '.cs', '.html', '.css', '.json', '.md', '.sql', '.rs', '.vue', '.svelte'
];

export interface GitHubRepoResponse {
  repo: string;
  branch: string;
  files: Array<{
    path: string;
    language: string;
    size: number;
    content: string;
  }>;
}

const getClient = (token?: string) => {
  return new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
    userAgent: 'CodeSensei-Backend/1.0'
  });
};

/**
 * Validates the GitHub URL and extracts owner/repo.
 */
export const parseGithubUrl = (url: string): { owner: string; repo: string } => {
  try {
    const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
    const urlObj = new URL(cleanUrl);
    if (urlObj.hostname !== "github.com") {
      throw new Error("Invalid host. Only github.com is supported.");
    }
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL format. Use https://github.com/owner/repo");
    }
    return { owner: parts[0], repo: parts[1].replace(".git", "") };
  } catch (error) {
    // Handle short format "owner/repo"
    const parts = url.split("/");
    if (parts.length === 2) {
        return { owner: parts[0].trim(), repo: parts[1].trim() };
    }
    throw new Error(`Failed to parse URL: ${url}`);
  }
};

/**
 * Main service function to fetch repository content.
 */
export const fetchRepository = async (
  url: string, 
  branch?: string, 
  token?: string
): Promise<GitHubRepoResponse> => {
  const { owner, repo } = parseGithubUrl(url);
  const octokit = getClient(token);

  try {
    // 1. Get the default branch if not specified
    let targetBranch = branch;
    if (!targetBranch) {
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      targetBranch = repoData.default_branch;
    }

    // 2. Fetch the Git Tree (Recursive)
    // Note: The Git Database API has a limit on tree size.
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: targetBranch,
      recursive: "true",
    });

    // 3. Filter relevant files
    const relevantBlobs = treeData.tree.filter((node) => {
      if (node.type !== "blob" || !node.path) return false;
      
      const path = node.path.toLowerCase();
      
      // Exclusions
      if (path.includes('node_modules/') || 
          path.includes('.git/') || 
          path.startsWith('dist/') || 
          path.startsWith('build/') ||
          path.startsWith('.next/') ||
          path.startsWith('coverage/')) return false;

      // Lock files and binary assets
      if (path.endsWith('package-lock.json') || 
          path.endsWith('yarn.lock') || 
          path.endsWith('.png') || 
          path.endsWith('.jpg') ||
          path.endsWith('.ico')) return false;

      // Extension Check
      return RELEVANT_EXTENSIONS.some(ext => path.endsWith(ext));
    });

    if (relevantBlobs.length === 0) {
      throw new Error("No relevant code files found in this repository.");
    }

    // 4. Fetch File Contents
    // We limit concurrency to avoid hitting secondary rate limits
    const files: GitHubRepoResponse['files'] = [];
    const MAX_FILES_TO_FETCH = 100; // Hard limit for demo performance
    const filesToFetch = relevantBlobs.slice(0, MAX_FILES_TO_FETCH);

    const results = await Promise.all(filesToFetch.map(async (node) => {
      try {
        if (!node.path || !node.sha) return null;

        // Size check (if available in tree)
        if (node.size && node.size > MAX_FILE_SIZE) {
          return {
            path: node.path,
            language: 'skipped',
            size: node.size,
            content: `// [TRUNCATED] File too large (${(node.size/1024).toFixed(1)}KB)`
          };
        }

        const { data } = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: node.sha,
        });

        // Content is base64
        const buffer = Buffer.from(data.content, "base64");
        let text = buffer.toString("utf-8");

        // Truncate if too long
        if (text.length > TRUNCATE_LIMIT) {
          text = text.substring(0, TRUNCATE_LIMIT) + "\n\n// [TRUNCATED] File content limit reached.";
        }

        return {
          path: node.path,
          language: node.path.split('.').pop() || 'text',
          size: node.size || text.length,
          content: text
        };
      } catch (err) {
        console.warn(`Failed to fetch content for ${node.path}`, err);
        return null;
      }
    }));

    // Filter out failed fetches
    const validFiles = results.filter((f): f is typeof files[0] => f !== null);

    return {
      repo: `${owner}/${repo}`,
      branch: targetBranch,
      files: validFiles
    };

  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found or is private.`);
    }
    if (error.status === 403 && error.headers?.['x-ratelimit-remaining'] === '0') {
      throw new Error("GitHub API rate limit exceeded. Please try again later or use a Token.");
    }
    throw error;
  }
};
