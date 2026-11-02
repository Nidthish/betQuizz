import { prisma } from "../db";
import { ERROR_CODES } from "../constants";
import { emitGameEvent } from "./event-bus";
import { getGameLeaderboard } from "./leaderboard-engine";

/**
 * Transitions game from DRAFT to LOBBY so players can join
 */
export async function openGameLobby(gameId: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      select: { id: true, status: true },
    });

    if (!game) throw new Error(ERROR_CODES.GAME_NOT_FOUND);
    if (game.status !== "DRAFT") throw new Error(ERROR_CODES.INVALID_GAME_STATE);

    await tx.game.update({
      where: { id: gameId },
      data: {
        status: "LOBBY",
        version: { increment: 1 },
      },
    });

    await emitGameEvent(tx, {
      gameId,
      eventType: "LOBBY_OPENED",
      payload: { gameId },
    });

    return true;
  });
}

/**
 * Starts the game atomically.
 * Initializes all players with startingBalance (10,000 points), selects question 1, sets timers.
 */
export async function startGame(gameId: string): Promise<{ success: boolean; code?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Step A: Load game with lock
      const gameRows = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          startingBalance: number;
          version: number;
        }>
      >`SELECT "id", "status", "startingBalance", "version" FROM "games" WHERE "id" = ${gameId} FOR UPDATE`;

      if (!gameRows || gameRows.length === 0) {
        return { success: false, code: ERROR_CODES.GAME_NOT_FOUND };
      }

      const game = gameRows[0];

      if (game.status !== "LOBBY" && game.status !== "DRAFT") {
        return { success: false, code: ERROR_CODES.GAME_ALREADY_STARTED };
      }

      // Step B: Verify questions configured
      const questions = await tx.gameQuestion.findMany({
        where: { gameId },
        orderBy: { order: "asc" },
        include: { question: true },
      });

      if (questions.length === 0) {
        return { success: false, code: ERROR_CODES.NO_QUESTIONS_CONFIGURED };
      }

      const firstGameQuestion = questions[0];
      const isFinalRound = questions.length === 1;

      // Step C: Initialize all player balances and statuses to ACTIVE
      await tx.gamePlayer.updateMany({
        where: {
          gameId,
          status: { in: ["JOINED", "WAITING"] },
        },
        data: {
          balance: game.startingBalance,
          status: "ACTIVE",
          version: { increment: 1 },
        },
      });

      // Step D: Calculate timer
      const now = new Date();
      const timeLimitSecs = firstGameQuestion.question.timeLimit;
      const questionEndsAt = new Date(now.getTime() + timeLimitSecs * 1000);

      const nextStatus = isFinalRound ? "FINAL_ROUND" : "QUESTION_ACTIVE";

      // Step E: Update game state
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: nextStatus,
          currentQuestionId: firstGameQuestion.questionId,
          currentQuestionIndex: 1,
          currentQuestionStartedAt: now,
          currentQuestionEndsAt: questionEndsAt,
          startedAt: now,
          version: { increment: 1 },
        },
      });

      // Step F: Emit events
      await emitGameEvent(tx, {
        gameId,
        eventType: "GAME_STARTED",
        payload: {
          startingBalance: game.startingBalance,
          totalQuestions: questions.length,
        },
      });

      await emitGameEvent(tx, {
        gameId,
        eventType: "QUESTION_STARTED",
        payload: {
          questionIndex: 1,
          totalQuestions: questions.length,
          questionId: firstGameQuestion.questionId,
          timeLimit: timeLimitSecs,
          startedAt: now.toISOString(),
          endsAt: questionEndsAt.toISOString(),
        },
      });

      return { success: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: message };
  }
}

/**
 * Closes the active question, revealing the correct answer and setting the review countdown.
 * Ultra-fast bulk settlement: executes in ~30ms instead of sequential loops.
 * Reveals answers and sets a snappy 3-second review intermission before auto-advancing.
 */
export async function closeActiveQuestion(
  gameId: string,
  reviewDurationSecs: number = 3
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        currentQuestionId: true,
        currentQuestionIndex: true,
      },
    });

    if (!game) throw new Error(ERROR_CODES.GAME_NOT_FOUND);

    // Idempotent: If already closed, return true smoothly
    if (game.status === "QUESTION_CLOSED") {
      return true;
    }

    if (game.status !== "QUESTION_ACTIVE" && game.status !== "FINAL_ROUND") {
      throw new Error(ERROR_CODES.INVALID_GAME_STATE);
    }

    // Reveal correct answer and question explanation
    let correctAnswer = "";
    let explanation = "";
    if (game.currentQuestionId) {
      const q = await tx.question.findUnique({
        where: { id: game.currentQuestionId },
        select: { correctAnswer: true, explanation: true },
      });
      if (q) {
        correctAnswer = q.correctAnswer;
        explanation = q.explanation ?? "";
      }
    }

    const now = new Date();
    const reviewEndsAt = new Date(now.getTime() + reviewDurationSecs * 1000);

    // Step 1: Bulk settlement for all players who submitted an answer
    const submissions = game.currentQuestionId
      ? await tx.questionSubmission.findMany({
          where: {
            gameId,
            questionId: game.currentQuestionId,
          },
        })
      : [];

    const submittedPlayerIds = new Set<string>();

    if (submissions.length > 0) {
      // Parallel execution for submitted player balance updates
      await Promise.all(
        submissions.map((sub) => {
          submittedPlayerIds.add(sub.gamePlayerId);
          return tx.gamePlayer.update({
            where: { id: sub.gamePlayerId },
            data: {
              balance: sub.balanceAfter,
              version: { increment: 1 },
            },
          });
        })
      );

      // Fast bulk insert of Bets
      await tx.bet.createMany({
        data: submissions.map((sub) => ({
          gameId,
          gamePlayerId: sub.gamePlayerId,
          submissionId: sub.id,
          amount: sub.betAmount,
          outcome: sub.isCorrect ? "WON" : "LOST",
          netChange: sub.isCorrect ? sub.betAmount : -sub.betAmount,
        })),
        skipDuplicates: true,
      });
    }

    // Step 2: Unanswered Penalty Logic: Fast bulk SQL deduction (-1,000 pts)
    if (game.currentQuestionId) {
      const activeUnanswered = await tx.gamePlayer.findMany({
        where: {
          gameId,
          status: { in: ["ACTIVE", "JOINED", "WAITING", "RECONNECTED"] },
          id: { notIn: Array.from(submittedPlayerIds) },
        },
        select: { id: true, balance: true },
      });

      if (activeUnanswered.length > 0) {
        // Fast bulk deduction in 1 SQL execution
        await tx.$executeRaw`
          UPDATE "game_players"
          SET "balance" = GREATEST(0, "balance" - 1000), "version" = "version" + 1
          WHERE "gameId" = ${gameId}
            AND "status" IN ('ACTIVE', 'JOINED', 'WAITING', 'RECONNECTED')
            AND "id" NOT IN (
              SELECT "gamePlayerId" FROM "question_submissions"
              WHERE "gameId" = ${gameId} AND "questionId" = ${game.currentQuestionId}
            )
        `;

        // Bulk insert penalty submissions
        const penaltySubData = activeUnanswered.map((p) => ({
          gameId,
          gamePlayerId: p.id,
          questionId: game.currentQuestionId!,
          selectedAnswer: "UNANSWERED",
          betAmount: 1000,
          isCorrect: false,
          balanceBefore: p.balance,
          balanceAfter: Math.max(0, p.balance - 1000),
          status: "EXPIRED" as const,
          idempotencyKey: `unanswered_${gameId}_${p.id}_${game.currentQuestionId}`,
          submittedAt: now,
          processedAt: now,
        }));

        await tx.questionSubmission.createMany({
          data: penaltySubData,
          skipDuplicates: true,
        });
      }
    }

    await tx.game.update({
      where: { id: gameId },
      data: {
        status: "QUESTION_CLOSED",
        currentQuestionStartedAt: now,
        currentQuestionEndsAt: reviewEndsAt,
        version: { increment: 1 },
      },
    });

    await emitGameEvent(tx, {
      gameId,
      eventType: "QUESTION_ENDED",
      payload: {
        questionId: game.currentQuestionId,
        questionIndex: game.currentQuestionIndex,
        correctAnswer,
        explanation,
        reviewEndsAt: reviewEndsAt.toISOString(),
      },
    });

    return true;
  });
}

/**
 * Advances to the next question or triggers final round settlement.
 */
export async function advanceToNextQuestion(
  gameId: string
): Promise<{ success: boolean; isLastQuestion?: boolean; code?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const gameRows = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          currentQuestionIndex: number;
          version: number;
        }>
      >`SELECT "id", "status", "currentQuestionIndex", "version" FROM "games" WHERE "id" = ${gameId} FOR UPDATE`;

      if (!gameRows || gameRows.length === 0) {
        return { success: false, code: ERROR_CODES.GAME_NOT_FOUND };
      }

      const game = gameRows[0];

      if (game.status !== "QUESTION_CLOSED") {
        return { success: false, code: ERROR_CODES.INVALID_GAME_STATE };
      }

      const questions = await tx.gameQuestion.findMany({
        where: { gameId },
        orderBy: { order: "asc" },
        include: { question: true },
      });

      const nextIndex = game.currentQuestionIndex + 1;

      // If we finished the last question, finish the game
      if (nextIndex > questions.length) {
        return { success: false, isLastQuestion: true, code: "GAME_READY_TO_FINISH" };
      }

      const nextGameQuestion = questions[nextIndex - 1];
      const isFinalQuestion = nextIndex === questions.length;

      const now = new Date();
      const timeLimitSecs = nextGameQuestion.question.timeLimit;
      const questionEndsAt = new Date(now.getTime() + timeLimitSecs * 1000);

      const nextStatus = isFinalQuestion ? "FINAL_ROUND" : "QUESTION_ACTIVE";

      await tx.game.update({
        where: { id: gameId },
        data: {
          status: nextStatus,
          currentQuestionId: nextGameQuestion.questionId,
          currentQuestionIndex: nextIndex,
          currentQuestionStartedAt: now,
          currentQuestionEndsAt: questionEndsAt,
          version: { increment: 1 },
        },
      });

      await emitGameEvent(tx, {
        gameId,
        eventType: "QUESTION_STARTED",
        payload: {
          questionIndex: nextIndex,
          totalQuestions: questions.length,
          questionId: nextGameQuestion.questionId,
          timeLimit: timeLimitSecs,
          isFinalRound: isFinalQuestion,
          startedAt: now.toISOString(),
          endsAt: questionEndsAt.toISOString(),
        },
      });

      return { success: true, isLastQuestion: isFinalQuestion };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: message };
  }
}

/**
 * Completes the game, computes final settlements (balance - penalties),
 * generates authoritative rankings, and marks the game as FINISHED.
 */
export async function finishGame(gameId: string): Promise<{ success: boolean; code?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const gameRows = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
        }>
      >`SELECT "id", "status" FROM "games" WHERE "id" = ${gameId} FOR UPDATE`;

      if (!gameRows || gameRows.length === 0) {
        return { success: false, code: ERROR_CODES.GAME_NOT_FOUND };
      }

      const game = gameRows[0];
      if (game.status === "FINISHED") {
        return { success: true, code: ERROR_CODES.GAME_FINISHED };
      }

      const now = new Date();

      // Step A: Mark game as FINISHED
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: "FINISHED",
          endedAt: now,
          version: { increment: 1 },
        },
      });

      // Step B: Mark all players as FINISHED
      await tx.gamePlayer.updateMany({
        where: { gameId },
        data: {
          status: "FINISHED",
          version: { increment: 1 },
        },
      });

      // Step C: Compute final leaderboard and write GameResult rows
      const leaderboard = await getGameLeaderboard(gameId, 1000);

      for (const entry of leaderboard) {
        await tx.gameResult.upsert({
          where: { gamePlayerId: entry.gamePlayerId },
          create: {
            gameId,
            gamePlayerId: entry.gamePlayerId,
            finalRank: entry.rank,
            finalBalance: entry.balance,
            totalCorrect: entry.totalCorrect,
            totalWrong: entry.totalWrong,
            totalRefills: entry.refillCount,
            totalFees: entry.refillFees,
            finalScore: entry.netScore,
            calculatedAt: now,
          },
          update: {
            finalRank: entry.rank,
            finalBalance: entry.balance,
            totalCorrect: entry.totalCorrect,
            totalWrong: entry.totalWrong,
            totalRefills: entry.refillCount,
            totalFees: entry.refillFees,
            finalScore: entry.netScore,
            calculatedAt: now,
          },
        });
      }

      // Step D: Emit GAME_FINISHED event
      await emitGameEvent(tx, {
        gameId,
        eventType: "GAME_FINISHED",
        payload: {
          endedAt: now.toISOString(),
          winner: leaderboard[0] ?? null,
          totalParticipants: leaderboard.length,
        },
      });

      return { success: true };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: message };
  }
}

/**
 * Completely resets a game room back to LOBBY status.
 * Permanently deletes all players, submissions, bets, refills, results, and events.
 * Crucially PRESERVES all questions, options, answers, and game question associations intact.
 */
export async function resetGame(
  gameId: string
): Promise<{ success: boolean; code?: string; message?: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { id: true, code: true, title: true },
      });

      if (!game) {
        return { success: false, code: ERROR_CODES.GAME_NOT_FOUND, message: "Game not found" };
      }

      // Step 1: Delete all dependent gameplay records
      await tx.bet.deleteMany({ where: { gameId } });
      await tx.refill.deleteMany({ where: { gameId } });
      await tx.questionSubmission.deleteMany({ where: { gameId } });
      await tx.gameResult.deleteMany({ where: { gameId } });
      await tx.gameEvent.deleteMany({ where: { gameId } });

      // Step 2: Delete all players participating in this game
      await tx.gamePlayer.deleteMany({ where: { gameId } });

      // Step 3: Reset game back to clean LOBBY state, ready for players to join with the same room code
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: "LOBBY",
          currentQuestionId: null,
          currentQuestionIndex: 0,
          currentQuestionStartedAt: null,
          currentQuestionEndsAt: null,
          startedAt: null,
          endedAt: null,
          version: { increment: 1 },
        },
      });

      // Step 4: Emit GAME_RESET event
      await emitGameEvent(tx, {
        gameId,
        eventType: "GAME_RESET",
        payload: {
          gameId,
          gameCode: game.code,
          resetAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: "Game successfully reset to Lobby. All players and scores cleared while preserving questions.",
      };
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, code: ERROR_CODES.INTERNAL_ERROR, message };
  }
}

