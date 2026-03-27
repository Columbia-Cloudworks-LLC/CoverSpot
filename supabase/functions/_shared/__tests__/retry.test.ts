import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  isTransientError,
} from "../retry.ts";

describe("withRetry", () => {
  it("returns the result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, () => true, { maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, () => true, {
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
      jitterMs: 0,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(
      withRetry(fn, () => true, {
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 10,
        jitterMs: 0,
      })
    ).rejects.toThrow("always fails");

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does not retry when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("not retryable"));

    await expect(
      withRetry(fn, () => false, { maxRetries: 3, baseDelayMs: 1, jitterMs: 0 })
    ).rejects.toThrow("not retryable");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies exponential backoff delay", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("ok");

    const start = Date.now();
    await withRetry(fn, () => true, {
      maxRetries: 3,
      baseDelayMs: 50,
      maxDelayMs: 500,
      jitterMs: 0,
    });
    const elapsed = Date.now() - start;

    // First retry: 50ms, second retry: 100ms → at least ~150ms total
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it("caps delay at maxDelayMs", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const start = Date.now();
    await withRetry(fn, () => true, {
      maxRetries: 4,
      baseDelayMs: 100,
      maxDelayMs: 150,
      jitterMs: 0,
    });
    const elapsed = Date.now() - start;

    // 100 + 150 + 150 = 400ms max (capped at 150 for attempts 2+)
    expect(elapsed).toBeLessThan(600);
  });
});

describe("isTransientError", () => {
  it("detects 429 rate limit errors", () => {
    expect(isTransientError(new Error("Rate limited (429)"))).toBe(true);
  });

  it("detects 500 server errors", () => {
    expect(isTransientError(new Error("Spotify API 500: Internal"))).toBe(true);
  });

  it("detects 502 errors", () => {
    expect(isTransientError(new Error("502 Bad Gateway"))).toBe(true);
  });

  it("detects network errors", () => {
    expect(isTransientError(new Error("fetch failed: ECONNRESET"))).toBe(true);
  });

  it("returns false for auth errors", () => {
    expect(isTransientError(new Error("Token expired (401)"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isTransientError("string error")).toBe(false);
  });
});
