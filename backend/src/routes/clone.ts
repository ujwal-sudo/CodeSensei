import { Router } from "express";
import { parseGithubUrl, getRepoTree, getFileContent } from "../githubClient";

const router = Router();

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || "100000"); // 100KB
const MAX_FILES_FETCH = parseInt(process.env.MAX_FILES_TO_FETCH || "50");

// Whitelist of relevant extensions to save bandwidth/tokens
const RELEVANT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb', '.php', 
  '.c', '.cpp', '.h', '.cs', '.html', '.css', '.json', '.md', '.sql', '.rs'
];

router.post("/", async (req: any, res: any) => {
  try {
    const { githubUrl, ref, githubToken } = req.body;

    if (!githubUrl) {
      return res.status(400).json({ error: "Missing githubUrl in body" });
    }

    const { owner, repo } = parseGithubUrl(githubUrl);
    
    // Log intent (masking token)
    console.log(`[Clone] Fetching tree for ${owner}/${repo}... ${githubToken ? '(Using User Token)' : '(Using Server Token)'}`);
    
    const tree = await getRepoTree(owner, repo, ref, githubToken);
    
    // Filter relevant files
    const codeFiles = tree.filter(node => {
        const lowerPath = node.path?.toLowerCase() || "";
        // Exclude lock files, images, etc.
        if (lowerPath.includes('package-lock') || lowerPath.includes('yarn.lock')) return false;
        if (lowerPath.startsWith('dist/') || lowerPath.startsWith('build/') || lowerPath.startsWith('node_modules/')) return false;
        
        return RELEVANT_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    });

    console.log(`[Clone] Found ${tree.length} total files. Filtering to ${codeFiles.length} relevant code files.`);

    // Prioritize fetching: Limit to top N files to avoid timeout
    const filesToFetch = codeFiles.slice(0, MAX_FILES_FETCH);
    
    const results = await Promise.all(filesToFetch.map(async (node) => {
      try {
        if (!node.path || !node.sha) return null;
        
        // Skip huge files if size is reported (Git Tree API sometimes includes size)
        if (node.size && node.size > MAX_FILE_SIZE) {
            return {
                path: node.path,
                language: node.path.split('.').pop(),
                size: node.size,
                content: `// [TRUNCATED] File is too large (${node.size} bytes) for inline analysis.`,
                content_truncated: true
            };
        }

        const content = await getFileContent(owner, repo, node.sha, githubToken);
        
        return {
          path: node.path,
          name: node.path.split('/').pop(),
          language: node.path.split('.').pop(),
          size: node.size || content.length,
          content: content
        };
      } catch (err) {
        console.error(`Failed to fetch ${node.path}`, err);
        return {
            path: node.path,
            language: 'error',
            size: 0,
            content: '// Error fetching file content'
        };
      }
    }));

    const validFiles = results.filter(f => f !== null);

    res.json({
      repo: `${owner}/${repo}`,
      files: validFiles,
      meta: {
        totalFilesFound: tree.length,
        filesProcessed: validFiles.length
      }
    });

  } catch (error: any) {
    console.error("[Clone Error]", error);
    const status = error.status || 500;
    res.status(status).json({ 
        error: error.message || "Internal Server Error",
        details: error.response?.data 
    });
  }
});

export default router;