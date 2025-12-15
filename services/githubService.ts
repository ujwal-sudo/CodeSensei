

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
}

export const importRepository = async (request: ImportRepoRequest): Promise<ImportRepoResponse> => {
  // Use VITE env var or fallback
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

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
    return data;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: "Request timed out. The repository might be too large." };
    }
    // Network errors (e.g. backend offline)
    if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error("Backend unavailable"); // Special throw to trigger demo mode in UI
    }
    return { success: false, error: error.message || "Unknown error occurred" };
  }
};
