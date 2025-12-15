
import { Router } from "express";
import { fetchRepository } from "../services/githubClient";

const router = Router();

router.post("/import", async (req: any, res: any) => {
  try {
    const { url, branch, token } = req.body;

    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing 'url' in request body" 
      });
    }

    console.log(`[GitHub] Importing ${url} (Branch: ${branch || 'default'})...`);

    const data = await fetchRepository(url, branch, token);

    res.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    console.error("[GitHub Error]", error.message);
    
    // Determine status code based on error type
    let status = 500;
    if (error.message.includes("not found")) status = 404;
    if (error.message.includes("rate limit")) status = 429;
    if (error.message.includes("Invalid")) status = 400;

    res.status(status).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
});

export default router;
