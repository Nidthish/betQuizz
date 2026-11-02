import { Prisma } from "@prisma/client";
import { prisma } from "../db";

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  data: T | null;
}

/**
 * Checks if an idempotency key has already been successfully processed.
 */
export async function checkIdempotency<T>(
  key: string,
  scope: string,
  tx?: Prisma.TransactionClient
): Promise<IdempotencyResult<T>> {
  const db = tx ?? prisma;
  const existing = await db.idempotencyKey.findUnique({
    where: {
      key_scope: { key, scope },
    },
  });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      // Key expired, delete it
      await db.idempotencyKey.delete({
        where: { id: existing.id },
      });
      return { isDuplicate: false, data: null };
    }
    return { isDuplicate: true, data: existing.responsePayload as T };
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
