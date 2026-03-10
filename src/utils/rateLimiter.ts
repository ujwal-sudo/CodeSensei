/**
 * Rate Limiter Utility for OpenRouter API
 * 
 * Provides:
 * - Request queue with concurrency control (p-queue)
 * - Robust retry logic with Key Rotation
 * - Centralized rate limiting
 */

import PQueue from 'p-queue';
import { keyManager } from './keyManager';

// Configuration
const DEFAULT_DELAY_MS = 2000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2000;
const BACKOFF_MULTIPLIER = 2;
const QUEUE_CONCURRENCY = 3;

// Initialize Request Queue
const queue = new PQueue({ concurrency: QUEUE_CONCURRENCY });

/**
 * Sleep for a given number of milliseconds
 */
export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Schedule a robust request with:
 * 1. Concurrency Control (Queue)
 * 2. Automatic Key Rotation on 429/503
 * 3. Exponential Backoff
 * 
 * @param taskCreator - A function that takes an API Key and returns a Promise
 */
export const scheduleRobustRequest = async <T>(
    taskCreator: (apiKey: string) => Promise<T>
): Promise<T> => {

    // Wrap the task in the queue
    return queue.add(async () => {
        let lastError: Error | null = null;
        let backoffMs = INITIAL_BACKOFF_MS;

        for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
            try {
                // 1. Get Key (Rotates automatically)
                const apiKey = keyManager.getNextKey();

                // 2. Execute Task
                return await taskCreator(apiKey);

            } catch (error: any) {
                lastError = error;

                // Check if it's a retryable error (401 = bad key, 429 = rate limit, 503/500 = server)
                const isRetryable =
                    error.message?.includes('401') || // Bad key - rotate to next
                    error.message?.includes('User not found') ||
                    error.message?.includes('429') ||
                    error.message?.includes('rate limit') ||
                    error.message?.includes('Rate Limit') ||
                    error.message?.includes('Too Many Requests') ||
                    error.message?.includes('503') ||
                    error.message?.includes('500'); // sometimes 500s are transient

                if (isRetryable && attempt <= MAX_RETRIES) {
                    console.warn(`[RateLimiter] Error (${error.message}). Switching keys and backing off for ${backoffMs}ms...`);
                    await sleep(backoffMs);
                    backoffMs *= BACKOFF_MULTIPLIER;
                    continue; // Retry with next key
                }

                // If not retryable or retries exhausted
                throw error;
            }
        }
        throw lastError || new Error("Request failed after retries.");
    });
};

// Deprecated: Legacy support if needed, but better to use scheduleRobustRequest
export const rateLimitedRequest = async <T>(
    requestFn: () => Promise<T>,
    options: any = {}
): Promise<T> => {
    // Adapter to use new system, but without key injection if requestFn already has it
    // This effectively just queues it and retries, but can't rotate key inside requestFn
    return queue.add(async () => {
        // We can't rotate keys here because requestFn is a closure with key already bound presumably
        // So we just retry the closure
        let backoffMs = INITIAL_BACKOFF_MS;
        for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
            try {
                return await requestFn();
            } catch (e: any) {
                if (e.message?.includes('429') && attempt <= MAX_RETRIES) {
                    await sleep(backoffMs);
                    backoffMs *= 2;
                    continue;
                }
                throw e;
            }
        }
        throw new Error("Failed");
    });
};
