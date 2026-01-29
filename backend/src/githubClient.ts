import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
import { Buffer } from "buffer";

dotenv.config();

// Helper to create an authenticated client dynamically
const getClient = (token?: string) => {
  const auth = token || process.env.GITHUB_TOKEN;
  return new Octokit({
    auth,
    userAgent: 'CodeSensei-Backend/1.0'
  });
};

export interface RepoFile {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
  content?: string;
  encoding?: string;
}

/**
 * Validates the current server-side token (if any) on startup.
 */
export const validateConnection = async () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("[GitHub] No GITHUB_TOKEN provided in .env. API rate limits will be strictly limited (60/hr).");
    return false;
  }
  try {
    const octokit = getClient(token);
    const { data } = await octokit.users.getAuthenticated();
    console.log(`[GitHub] ✅ Authenticated as: ${data.login}`);
    return true;
  } catch (err: any) {
    console.error(`[GitHub] ❌ Token validation failed: ${err.message}`);
    console.warn("[GitHub] Proceeding in unauthenticated mode (Low Rate Limits).");
    return false;
  }
};

/**
 * Parses a GitHub URL to extract owner and repo.
 */
export const parseGithubUrl = (url: string): { owner: string; repo: string } => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== "github.com") {
      throw new Error("Invalid host. Only github.com is supported.");
    }
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL format.");
    }
    return { owner: parts[0], repo: parts[1].replace(".git", "") };
  } catch (error) {
    throw new Error(`Failed to parse URL: ${url}`);
  }
};

/**
 * Fetches the entire file tree of a repository.
 * Uses the Git Database API (getTree) with recursive=1.
 */
export const getRepoTree = async (owner: string, repo: string, ref?: string, token?: string) => {
  const octokit = getClient(token);
  
  // 1. Get the reference SHA if not provided (default to main/master)
  let sha = ref;
  if (!sha) {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    sha = repoData.default_branch;
  }

  // 2. Fetch the tree
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: sha!,
    recursive: "true",
  });

  // Filter for blobs (files) only
  return data.tree.filter((node) => node.type === "blob");
};

/**
 * Fetches content for a specific file blob.
 * Returns decoded string content.
 */
export const getFileContent = async (owner: string, repo: string, fileSha: string, token?: string): Promise<string> => {
  const octokit = getClient(token);
  const { data } = await octokit.git.getBlob({
    owner,
    repo,
    file_sha: fileSha,
  });
  
  // Content is base64 encoded
  const buffer = Buffer.from(data.content, "base64");
  return buffer.toString("utf-8");
};