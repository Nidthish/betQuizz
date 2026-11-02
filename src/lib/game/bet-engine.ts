import { prisma } from "../db";
import { ERROR_CODES } from "../constants";
import { GAME_CONSTANTS } from "../constants";
import { checkIdempotency, saveIdempotency } from "./idempotency";
import { emitGameEvent } from "./event-bus";

export interface SubmitResponseInput {
  gameId: string;
  gamePlayerId: string;
  questionId: string;
  selectedAnswer: string;
  betAmount: number;
  idempotencyKey: string;
}

export interface SubmitResponseOutput {
  success: boolean;
  submissionId?: string;
  isCorrect?: boolean;
  betAmount?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  correctAnswer?: string; // Revealed only when question is closed, otherwise hidden
  code?: string;
  message?: string;
}

/**
 * Atomically submits an answer and bet for a player on an active question.
 * Guaranteed atomic execution in a PostgreSQL transaction with row-level locking.
 */
export async function submitQuestionResponse(
  input: SubmitResponseInput
): Promise<SubmitResponseOutput> {
  const { gameId, gamePlayerId, questionId, selectedAnswer, betAmount, idempotencyKey } = input;

  const scope = `submit:${gamePlayerId}:${questionId}`;

  // 1. Check idempotency cache first
  const cached = await checkIdempotency<SubmitResponseOutput>(idempotencyKey, scope);
  if (cached.isDuplicate && cached.data) {
    return cached.data;
  }

  // 2. Perform atomic transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Load authoritative game state
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          currentQuestionId: true,
          currentQuestionEndsAt: true,
          version: true,
        },
      });

      if (!game) {
        throw new Error(ERROR_CODES.GAME_NOT_FOUND);
      }

      if (game.status !== "QUESTION_ACTIVE" && game.status !== "FINAL_ROUND") {
        throw new Error(ERROR_CODES.QUESTION_NOT_ACTIVE);
      }

      if (game.currentQuestionId !== questionId) {
        throw new Error(ERROR_CODES.QUESTION_NOT_ACTIVE);
      }

      // Step B: Authoritative timer validation
      const now = new Date();
      const cutoffTime = game.currentQuestionEndsAt
        ? new Date(game.currentQuestionEndsAt.getTime() + GAME_CONSTANTS.SUBMISSION_GRACE_PERIOD_MS)
        : null;

      if (cutoffTime && now > cutoffTime) {
        throw new Error(ERROR_CODES.QUESTION_EXPIRED);
      }

      // Step C: Check if player already submitted for this question
      const existingSubmission = await tx.questionSubmission.findUnique({
        where: {
          gamePlayerId_questionId: {
            gamePlayerId,
            questionId,
          },
        },
      });

      if (existingSubmission) {
        throw new Error(ERROR_CODES.ALREADY_SUBMITTED);
      }

      // Step D: Lock player row and read authoritative balance (Row-level lock using raw query or update)
      // Execute raw SELECT FOR UPDATE for maximum PostgreSQL ACID concurrency guarantee
      const playerRows = await tx.$queryRaw<
        Array<{ id: string; balance: number; version: number; gameId: string }>
      >`SELECT "id", "balance", "version", "gameId" FROM "game_players" WHERE "id" = ${gamePlayerId} AND "gameId" = ${gameId} FOR UPDATE`;

      if (!playerRows || playerRows.length === 0) {
        throw new Error(ERROR_CODES.PLAYER_NOT_FOUND);
      }

      const player = playerRows[0];
      const currentBalance = player.balance;

      // Step E: Validate bet rules
      if (betAmount < 1) {
        throw new Error(ERROR_CODES.INVALID_BET_AMOUNT);
      }

      if (betAmount > currentBalance) {
        throw new Error(ERROR_CODES.INSUFFICIENT_BALANCE);
      }

      // Step F: Validate question and check answer correctness
      const question = await tx.question.findUnique({
        where: { id: questionId },
        select: { id: true, correctAnswer: true },
      });

      if (!question) {
        throw new Error(ERROR_CODES.QUESTION_NOT_ACTIVE);
      }

      const isCorrect =
        question.correctAnswer.trim().toLowerCase() === selectedAnswer.trim().toLowerCase();

      // Step G: Calculate potential new balance according to rules
      const balanceBefore = currentBalance;
      const balanceAfter = isCorrect ? balanceBefore + betAmount : Math.max(0, balanceBefore - betAmount);

      // Step H: DO NOT update player's balance in game_players yet!
      // Balance remains strictly unchanged until the round timer expires.
      await tx.gamePlayer.update({
        where: { id: gamePlayerId },
        data: {
          lastSeenAt: new Date(),
        },
      });

      // Step I: Create submission record with locked bet & calculated outcome
      const submission = await tx.questionSubmission.create({
        data: {
          gameId,
          gamePlayerId,
          questionId,
          selectedAnswer,
          betAmount,
          isCorrect,
          balanceBefore,
          balanceAfter,
          status: "ACCEPTED",
          idempotencyKey,
          submittedAt: now,
          processedAt: new Date(),
        },
      });

      // Step J: Record audit game event for submission
      await emitGameEvent(tx, {
        gameId,
        gamePlayerId,
        eventType: "QUESTION_SUBMITTED",
        payload: {
          submissionId: submission.id,
          gamePlayerId,
          questionId,
          betAmount,
        },
      });

      // Crucial: Do NOT reveal isCorrect or balanceAfter before the question timer has ended!
      const responsePayload: SubmitResponseOutput = {
        success: true,
        submissionId: submission.id,
        betAmount,
        balanceBefore,
      };

      // Step L: Save idempotency
      await saveIdempotency(tx, idempotencyKey, scope, responsePayload as unknown as Record<string, unknown>);

      return responsePayload;
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (Object.values(ERROR_CODES).includes(message as keyof typeof ERROR_CODES)) {
      return {
        success: false,
        code: message,
        message: getHumanErrorMessage(message),
      };
    }

    return {
      success: false,
      code: ERROR_CODES.TRANSACTION_FAILED,
      message: "Submission failed. Please try again.",
    };
  }
}

function getHumanErrorMessage(code: string): string {
  switch (code) {
    case ERROR_CODES.QUESTION_EXPIRED:
      return "Time has expired for this question.";
    case ERROR_CODES.ALREADY_SUBMITTED:
      return "You have already submitted your bet for this question.";
    case ERROR_CODES.INSUFFICIENT_BALANCE:
      return "Your bet exceeds your current balance.";
    case ERROR_CODES.INVALID_BET_AMOUNT:
      return "Bet must be at least 1 point.";
    case ERROR_CODES.QUESTION_NOT_ACTIVE:
      return "This question is not currently active.";
    default:
      return "An error occurred during submission.";
  }
}
