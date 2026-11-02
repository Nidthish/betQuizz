import { prisma } from "../db";

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryRateLimitMap = new Map<string, MemoryBucket>();

// Periodic memory cleanup to prevent memory bloat
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
 * Checks and increments rate limit counter.
 * Uses fast in-memory check first, followed by database-backed persistence
 * to ensure limits apply across distributed Vercel instances.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 20,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();

  // Fast memory check
  const mem = memoryRateLimitMap.get(key);
  if (mem && mem.resetAt > now) {
    if (mem.count >= maxAttempts) {
      return { success: false, remaining: 0, resetAt: mem.resetAt };
    }
    mem.count += 1;
  } else {
    memoryRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
  }

  // Cross-instance database check via PostgreSQL upsert
  try {
    const record = await prisma.rateLimitRecord.findUnique({
      where: { key },
    });

    if (!record || now - record.windowStart.getTime() > windowMs) {
      // Start a new window
      await prisma.rateLimitRecord.upsert({
        where: { key },
        create: { key, count: 1, windowStart: new Date(now) },
        update: { count: 1, windowStart: new Date(now) },
      });
      return { success: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
    }

    if (record.count >= maxAttempts) {
      const resetAt = record.windowStart.getTime() + windowMs;
      return { success: false, remaining: 0, resetAt };
    }

    // Increment counter in DB
    const updated = await prisma.rateLimitRecord.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    const resetAt = updated.windowStart.getTime() + windowMs;
    return {
      success: updated.count <= maxAttempts,
      remaining: Math.max(0, maxAttempts - updated.count),
      resetAt,
    };
  } catch {
    // If DB check fails, rely on memory fallback
    const memCurrent = memoryRateLimitMap.get(key)?.count ?? 1;
    return {
      success: memCurrent <= maxAttempts,
      remaining: Math.max(0, maxAttempts - memCurrent),
      resetAt: now + windowMs,
    };
  }
}
