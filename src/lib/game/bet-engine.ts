import { prisma } from "../db";
import { ERROR_CODES, GAME_CONSTANTS } from "../constants";
import { checkIdempotency, saveIdempotency } from "./idempotency";
import { emitGameEvent } from "./event-bus";

export interface SubmitResponseInput {
  gameId: string;
  gamePlayerId: string;
  questionId: string;
  selectedAnswer: string;
  betAmount: number;
  idempotencyKey: string;
  clientVersion?: number;
}

export interface SubmitResponseOutput {
  success: boolean;
  questionId?: string;
  betAmount?: number;
  result?: "WIN" | "LOSS";
  payout?: number;
  balance?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  isCorrect?: boolean;
  correctAnswer?: string;
  explanation?: string;
  betLocked?: boolean;
  bet?: {
    id: string;
    amount: number;
    status: string;
    outcome?: "WON" | "LOST";
    netChange?: number;
  };
  player?: {
    id: string;
    displayName: string;
    balance: number;
  };
  nextQuestion?: {
    id: string;
    number: number;
    order: number;
    questionText: string;
    options: string[];
    timeLimit: number;
    category?: string | null;
  } | null;
  game?: {
    status: string;
    completed: boolean;
    currentQuestionIndex: number;
    totalQuestions: number;
  };
  submissionId?: string;
  code?: string;
  message?: string;
}

/**
 * Atomically submits an answer and locks a bet for a player on an active question.
 * The player's balance is preserved during the active countdown and settled authoritatively
 * when the round timer expires (deferred settlement).
 */
export async function submitQuestionResponse(
  input: SubmitResponseInput
): Promise<SubmitResponseOutput> {
  const { gameId, gamePlayerId, questionId, selectedAnswer, betAmount, idempotencyKey } = input;

  const scope = `submit:${gamePlayerId}:${questionId}`;

  // 1. Check idempotency cache first (protects against browser retries & duplicate network requests)
  const cached = await checkIdempotency<SubmitResponseOutput>(idempotencyKey, scope);
  if (cached.isDuplicate && cached.data) {
    return cached.data;
  }

  // 2. Perform atomic transaction with PostgreSQL row-level locking
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Step A: Load authoritative game state & active question in ONE atomic query
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          currentQuestionId: true,
          currentQuestionEndsAt: true,
          version: true,
          gameQuestions: {
            where: { questionId },
            include: { question: true },
          },
          _count: {
            select: { gameQuestions: true },
          },
        },
      });

      if (!game) {
        throw new Error(ERROR_CODES.GAME_NOT_FOUND);
      }

      // If game is in LOBBY or DRAFT, the host has reset the game
      if (game.status === "LOBBY" || game.status === "DRAFT") {
        throw new Error(ERROR_CODES.GAME_RESET);
      }

      if (game.status !== "QUESTION_ACTIVE" && game.status !== "FINAL_ROUND") {
        throw new Error(ERROR_CODES.QUESTION_NOT_ACTIVE);
      }

      if (game.currentQuestionId !== questionId) {
        throw new Error(ERROR_CODES.QUESTION_EXPIRED);
      }

      // Step B: Authoritative timer validation with grace period
      const now = new Date();
      const cutoffTime = game.currentQuestionEndsAt
        ? new Date(game.currentQuestionEndsAt.getTime() + GAME_CONSTANTS.SUBMISSION_GRACE_PERIOD_MS)
        : null;

      if (cutoffTime && now > cutoffTime) {
        throw new Error(ERROR_CODES.QUESTION_EXPIRED);
      }

      const totalQuestions = game._count.gameQuestions;
      const gameQuestion = game.gameQuestions[0];
      if (!gameQuestion) {
        throw new Error(ERROR_CODES.QUESTION_NOT_ACTIVE);
      }

      // Step C: Lock player row and read authoritative balance (Row-level lock using SELECT FOR UPDATE)
      const playerRows = await tx.$queryRaw<
        Array<{ id: string; displayName: string; balance: number; version: number; gameId: string; status: string }>
      >`SELECT "id", "displayName", "balance", "version", "gameId", "status" FROM "game_players" WHERE "id" = ${gamePlayerId} AND "gameId" = ${gameId} FOR UPDATE`;

      if (!playerRows || playerRows.length === 0) {
        // Player record removed (e.g. game reset)
        throw new Error(ERROR_CODES.GAME_RESET);
      }

      const player = playerRows[0];
      if (player.status === "REMOVED") {
        throw new Error(ERROR_CODES.UNAUTHORIZED);
      }

      const currentBalance = player.balance;

      // Step D: Validate bet rules (Section 6: Minimum bet ₹500, Max bet = current balance)
      if (!Number.isInteger(betAmount) || betAmount < GAME_CONSTANTS.MINIMUM_BET) {
        throw new Error(ERROR_CODES.BET_BELOW_MINIMUM);
      }

      if (betAmount > currentBalance) {
        throw new Error(ERROR_CODES.BET_ABOVE_BALANCE);
      }

      const q = gameQuestion.question;
      const isCorrect = q.correctAnswer.trim().toLowerCase() === selectedAnswer.trim().toLowerCase();

      // Step E: Calculate potential outcome (deferred until round timer ends)
      const balanceBefore = currentBalance;
      const balanceAfter = isCorrect ? balanceBefore + betAmount : Math.max(0, balanceBefore - betAmount);

      // Step F: Upsert QuestionSubmission record atomically (guarantees idempotency & P2002 prevention)
      const submission = await tx.questionSubmission.upsert({
        where: {
          gamePlayerId_questionId: {
            gamePlayerId,
            questionId,
          },
        },
        create: {
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
          processedAt: now,
        },
        update: {
          selectedAnswer,
          betAmount,
          isCorrect,
          balanceBefore,
          balanceAfter,
          status: "ACCEPTED",
        },
      });

      // Step J: Emit game event
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

      // Step K: Return response confirming bet is locked
      const responsePayload: SubmitResponseOutput = {
        success: true,
        submissionId: submission.id,
        questionId,
        betAmount,
        balance: currentBalance,
        balanceBefore,
        betLocked: true,
        bet: {
          id: submission.id,
          amount: betAmount,
          status: "locked",
        },
        player: {
          id: player.id,
          displayName: player.displayName,
          balance: currentBalance,
        },
        game: {
          status: game.status,
          completed: false,
          currentQuestionIndex: gameQuestion.order,
          totalQuestions,
        },
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

    console.error("[Bet Engine Transaction Error]", err);
    return {
      success: false,
      code: ERROR_CODES.TRANSACTION_FAILED,
      message: "Bet submission failed. Please try again.",
    };
  }
}

export function getHumanErrorMessage(code: string): string {
  switch (code) {
    case ERROR_CODES.BET_BELOW_MINIMUM:
    case ERROR_CODES.INVALID_BET_AMOUNT:
      return "Minimum bet is ₹500.";
    case ERROR_CODES.BET_ABOVE_BALANCE:
    case ERROR_CODES.INSUFFICIENT_BALANCE:
      return "Your bet exceeds your current available balance.";
    case ERROR_CODES.ALREADY_SUBMITTED:
    case ERROR_CODES.DUPLICATE_BET:
      return "You have already submitted a bet for this question.";
    case ERROR_CODES.QUESTION_EXPIRED:
      return "Time has expired for this question.";
    case ERROR_CODES.QUESTION_NOT_ACTIVE:
      return "This question is not currently active.";
    case ERROR_CODES.GAME_RESET:
      return "Game has been reset by the administrator.";
    case ERROR_CODES.GAME_NOT_STARTED:
      return "The game has not started yet. Please wait in the lobby.";
    case ERROR_CODES.GAME_ALREADY_COMPLETED:
      return "This game has already finished.";
    case ERROR_CODES.GAME_PAUSED:
      return "Game is temporarily paused by the host.";
    default:
      return "An error occurred during submission. Please try again.";
  }
}
