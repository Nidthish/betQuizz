import { Prisma } from "@prisma/client";
import { prisma } from "../db";

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  data: T | null;
}

// In-memory cache for ultra-fast deduplication (0ms)
const memoryIdempotencyCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Checks if an idempotency key has already been processed.
 * Checks fast memory first, then database.
 */
export async function checkIdempotency<T>(
  key: string,
  scope: string,
  tx?: Prisma.TransactionClient
): Promise<IdempotencyResult<T>> {
  const cacheKey = `${scope}:${key}`;
  const now = Date.now();

  const mem = memoryIdempotencyCache.get(cacheKey);
  if (mem && mem.expiresAt > now) {
    return { isDuplicate: true, data: mem.data as T };
  }

  const db = tx ?? prisma;
  const existing = await db.idempotencyKey.findUnique({
    where: {
      key_scope: { key, scope },
    },
  });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      return { isDuplicate: false, data: null };
    }
    const data = existing.responsePayload as T;
    memoryIdempotencyCache.set(cacheKey, {
      data,
      expiresAt: existing.expiresAt.getTime(),
    });
    return { isDuplicate: true, data };
  }

  return { isDuplicate: false, data: null };
}

/**
 * Stores an idempotency record alongside the transaction result.
 */
export async function saveIdempotency(
  tx: Prisma.TransactionClient,
  key: string,
  scope: string,
  responsePayload: Record<string, unknown>,
  ttlMinutes: number = 60
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const cacheKey = `${scope}:${key}`;

  memoryIdempotencyCache.set(cacheKey, {
    data: responsePayload,
    expiresAt: expiresAt.getTime(),
  });

  await tx.idempotencyKey.upsert({
    where: {
      key_scope: { key, scope },
    },
    create: {
      key,
      scope,
      responsePayload: responsePayload as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      responsePayload: responsePayload as Prisma.InputJsonValue,
      expiresAt,
    },
  });
}
