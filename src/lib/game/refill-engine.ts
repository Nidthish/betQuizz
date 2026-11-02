import { prisma } from "../db";
import { ERROR_CODES } from "../constants";
import { checkIdempotency, saveIdempotency } from "./idempotency";
import { emitGameEvent } from "./event-bus";

export interface RefillInput {
  gameId: string;
  gamePlayerId: string;
  idempotencyKey: string;
}

export interface RefillOutput {
  success: boolean;
  refillId?: string;
  amount?: number;
  fee?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  refillCount?: number;
  totalRefillFees?: number;
  code?: string;
  message?: string;
}

/**
 * Atomically refills a player's points when their balance is exactly 0.
 * Strictly transactional with row locking to prevent race conditions or double refills.
 */
export async function executePlayerRefill(input: RefillInput): Promise<RefillOutput> {
  const { gameId, gamePlayerId, idempotencyKey } = input;
  const scope = `refill:${gamePlayerId}`;

  // 1. Check idempotency cache
  const cached = await checkIdempotency<RefillOutput>(idempotencyKey, scope);
  if (cached.isDuplicate && cached.data) {
    return cached.data;
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Step A: Check game configuration
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          refillAmount: true,
          refillFee: true,
        },
      });

      if (!game) {
        throw new Error(ERROR_CODES.GAME_NOT_FOUND);
      }

      if (game.status === "FINISHED" || game.status === "CANCELLED") {
        throw new Error(ERROR_CODES.GAME_FINISHED);
      }

      // Step B: Lock player row and read authoritative balance
      const playerRows = await tx.$queryRaw<
        Array<{
          id: string;
          balance: number;
          refillCount: number;
          totalRefillAmount: number;
          totalRefillFees: number;
          gameId: string;
        }>
      >`SELECT "id", "balance", "refillCount", "totalRefillAmount", "totalRefillFees", "gameId" FROM "game_players" WHERE "id" = ${gamePlayerId} AND "gameId" = ${gameId} FOR UPDATE`;

      if (!playerRows || playerRows.length === 0) {
        throw new Error(ERROR_CODES.PLAYER_NOT_FOUND);
      }

      const player = playerRows[0];

      // Step C: Strictly enforce that balance must be zero
      if (player.balance > 0) {
        throw new Error(ERROR_CODES.REFILL_NOT_ALLOWED);
      }

      const balanceBefore = player.balance;
      const refillAmount = game.refillAmount;
      const refillFee = game.refillFee;
      const balanceAfter = balanceBefore + refillAmount;

      const newRefillCount = player.refillCount + 1;
      const newTotalAmount = player.totalRefillAmount + refillAmount;
      const newTotalFees = player.totalRefillFees + refillFee;

      // Step D: Update player balance and refill statistics
      await tx.gamePlayer.update({
        where: { id: gamePlayerId },
        data: {
          balance: balanceAfter,
          refillCount: newRefillCount,
          totalRefillAmount: newTotalAmount,
          totalRefillFees: newTotalFees,
          version: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });

      // Step E: Create refill record
      const refill = await tx.refill.create({
        data: {
          gameId,
          gamePlayerId,
          amount: refillAmount,
          fee: refillFee,
          balanceBefore,
          balanceAfter,
          idempotencyKey,
        },
      });

      // Step F: Emit events
      await emitGameEvent(tx, {
        gameId,
        gamePlayerId,
        eventType: "REFILL_CREATED",
        payload: {
          refillId: refill.id,
          amount: refillAmount,
          fee: refillFee,
          balanceAfter,
          refillCount: newRefillCount,
        },
      });

      await emitGameEvent(tx, {
        gameId,
        gamePlayerId,
        eventType: "BALANCE_UPDATED",
        payload: {
          gamePlayerId,
          balanceBefore,
          balanceAfter,
          netChange: refillAmount,
        },
      });

      const output: RefillOutput = {
        success: true,
        refillId: refill.id,
        amount: refillAmount,
        fee: refillFee,
        balanceBefore,
        balanceAfter,
        refillCount: newRefillCount,
        totalRefillFees: newTotalFees,
      };

      // Step G: Save idempotency
      await saveIdempotency(tx, idempotencyKey, scope, output as unknown as Record<string, unknown>);

      return output;
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === ERROR_CODES.REFILL_NOT_ALLOWED) {
      return {
        success: false,
        code: ERROR_CODES.REFILL_NOT_ALLOWED,
        message: "Refill is only permitted when your balance is 0.",
      };
    }

    if (Object.values(ERROR_CODES).includes(message as keyof typeof ERROR_CODES)) {
      return {
        success: false,
        code: message,
        message: "Unable to process refill.",
      };
    }

    return {
      success: false,
      code: ERROR_CODES.TRANSACTION_FAILED,
      message: "Refill failed due to a database conflict. Please try again.",
    };
  }
}
