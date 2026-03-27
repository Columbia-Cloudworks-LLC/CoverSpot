export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitterMs: 1000,
};

export class RetriesExhaustedError extends Error {
  public readonly attempts: number;
  public readonly lastError: unknown;

  constructor(attempts: number, lastError: unknown) {
    super(
      `All ${attempts} retry attempts exhausted. Last error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
    this.name = "RetriesExhaustedError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Executes `fn` with capped exponential backoff and jitter.
 *
 * `shouldRetry` receives the thrown error and the 0-based attempt index.
 * Return `true` to retry, `false` to immediately re-throw.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt >= cfg.maxRetries || !shouldRetry(err, attempt)) {
        throw err;
      }

      const expDelay = Math.min(
        cfg.baseDelayMs * Math.pow(2, attempt),
        cfg.maxDelayMs
      );
      const jitter = Math.random() * cfg.jitterMs;
      await sleep(expDelay + jitter);
    }
  }

  throw new RetriesExhaustedError(cfg.maxRetries, lastError);
}

/**
 * Checks if a Spotify/YouTube HTTP error is transient and worth retrying.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;
    if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("fetch failed")) return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
