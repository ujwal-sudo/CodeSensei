/**
 * Rate Limiter Utility for OpenRouter API
 * 
 * Provides:
 * - Request queue with configurable delay between requests
 * - Retry logic with exponential backoff for 429 errors
 * - Centralized rate limiting for all API calls
 */

// Configuration
const DEFAULT_DELAY_MS = 3000; // 3 seconds between requests
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 3000; // Start with 3 second backoff
const BACKOFF_MULTIPLIER = 2; // Double the backoff each retry

// Global request queue state
let lastRequestTime = 0;
let requestQueue: Promise<void> = Promise.resolve();

/**
 * Sleep for a given number of milliseconds
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ensures minimum delay between API requests
 * Call this before making any API request
 */
export const waitForRateLimit = async (delayMs: number = DEFAULT_DELAY_MS): Promise<void> => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < delayMs) {
        const waitTime = delayMs - timeSinceLastRequest;
        console.log(`[RateLimiter] Waiting ${waitTime}ms before next request...`);
        await sleep(waitTime);
    }

    lastRequestTime = Date.now();
};

/**
 * Queue a request to ensure sequential execution with delays
 * Wraps any async function to be rate-limited
 */
export const queueRequest = async <T>(
    requestFn: () => Promise<T>,
    delayMs: number = DEFAULT_DELAY_MS
): Promise<T> => {
    // Chain this request after all previous requests
    const previousQueue = requestQueue;

    let resolveQueue: () => void;
    requestQueue = new Promise(resolve => { resolveQueue = resolve; });

    try {
        // Wait for previous requests to complete
        await previousQueue;

        // Wait for rate limit
        await waitForRateLimit(delayMs);

        // Execute the request
        return await requestFn();
    } finally {
        // Signal that this request is done
        resolveQueue!();
    }
};

/**
 * Executes a request with retry logic and exponential backoff
 * Specifically handles 429 rate limit errors
 */
export const withRetry = async <T>(
    requestFn: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
    initialBackoffMs: number = INITIAL_BACKOFF_MS
): Promise<T> => {
    let lastError: Error | null = null;
    let backoffMs = initialBackoffMs;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            lastError = error;

            // Check if it's a rate limit error (429)
            const isRateLimitError =
                error.message?.includes('429') ||
                error.message?.includes('rate limit') ||
                error.message?.includes('Rate Limit') ||
                error.message?.includes('Too Many Requests');

            if (isRateLimitError && attempt <= maxRetries) {
                console.warn(`[RateLimiter] Rate limit hit (attempt ${attempt}/${maxRetries + 1}). Backing off for ${backoffMs}ms...`);
                await sleep(backoffMs);
                backoffMs *= BACKOFF_MULTIPLIER; // Exponential backoff
                continue;
            }

            // For non-rate-limit errors or if we've exhausted retries, throw
            throw error;
        }
    }

    throw lastError;
};

/**
 * Combined utility: Queue request + Retry logic
 * Use this for all OpenRouter API calls
 */
export const rateLimitedRequest = async <T>(
    requestFn: () => Promise<T>,
    options: {
        delayMs?: number;
        maxRetries?: number;
        initialBackoffMs?: number;
    } = {}
): Promise<T> => {
    const {
        delayMs = DEFAULT_DELAY_MS,
        maxRetries = MAX_RETRIES,
        initialBackoffMs = INITIAL_BACKOFF_MS
    } = options;

    return queueRequest(
        () => withRetry(requestFn, maxRetries, initialBackoffMs),
        delayMs
    );
};

/**
 * Reset the rate limiter state (useful for testing)
 */
export const resetRateLimiter = (): void => {
    lastRequestTime = 0;
    requestQueue = Promise.resolve();
};
