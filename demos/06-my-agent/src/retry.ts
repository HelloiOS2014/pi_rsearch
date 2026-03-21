/**
 * Exponential backoff retry — wraps async functions with
 * configurable retry logic for transient API errors.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

/** Determine if an error is retryable (transient). */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const name = error.constructor.name;

  // API rate limits and overload
  if (message.includes("overloaded")) return true;
  if (message.includes("rate_limit")) return true;
  if (message.includes("rate limit")) return true;
  if (message.includes("too many requests")) return true;
  if (message.includes("529")) return true;

  // HTTP status codes in error messages
  if (message.includes("429")) return true;
  if (message.includes("500")) return true;
  if (message.includes("502")) return true;
  if (message.includes("503")) return true;
  if (message.includes("504")) return true;

  // Network errors
  if (message.includes("econnreset")) return true;
  if (message.includes("etimedout")) return true;
  if (message.includes("fetch failed")) return true;
  if (name === "APIConnectionError") return true;

  // Non-retryable: auth errors, validation errors
  if (message.includes("401")) return false;
  if (message.includes("403")) return false;
  if (message.includes("invalid_api_key")) return false;
  if (message.includes("authentication")) return false;
  if (message.includes("invalid_request")) return false;

  return false;
}

/**
 * Wraps an async function with exponential backoff retry.
 *
 * @example
 * const result = await withRetry(() => client.messages.create(params), {
 *   maxRetries: 3,
 *   onRetry: (err, attempt) => console.log(`Retry ${attempt}: ${err.message}`),
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on final attempt or non-retryable errors
      if (attempt === opts.maxRetries || !isRetryable(error)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * opts.baseDelayMs;
      const delay = Math.min(exponentialDelay + jitter, opts.maxDelayMs);

      opts.onRetry?.(lastError, attempt + 1, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError ?? new Error("Retry failed");
}
