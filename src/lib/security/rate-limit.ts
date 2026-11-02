interface MemoryBucket {
  count: number;
  resetAt: number;
}

// Ultra-fast in-memory rate limiting cache (0ms latency, zero database round-trips)
const memoryRateLimitMap = new Map<string, MemoryBucket>();

// Periodic cleanup every 60s to prevent memory bloat
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryRateLimitMap.entries()) {
      if (bucket.resetAt <= now) {
        memoryRateLimitMap.delete(key);
      }
    }
  }, 60000);
}

/**
 * Checks and increments rate limit counter in-memory.
 * Eliminates all remote database network latency from the critical path.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 30,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const bucket = memoryRateLimitMap.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // New rate limit window
    const resetAt = now + windowMs;
    memoryRateLimitMap.set(key, { count: 1, resetAt });
    return { success: true, remaining: maxAttempts - 1, resetAt };
  }

  if (bucket.count >= maxAttempts) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    success: true,
    remaining: maxAttempts - bucket.count,
    resetAt: bucket.resetAt,
  };
}
