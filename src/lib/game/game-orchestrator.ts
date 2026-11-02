import { prisma } from "../db";
import { closeActiveQuestion, advanceToNextQuestion, finishGame } from "./game-engine";

// Maintain in-process timer handles mapped by gameId
const gameTimers = new Map<string, NodeJS.Timeout>();

/**
 * Cancels any pending scheduled timer for this game.
 */
export function cancelGameTimer(gameId: string) {
  const existing = gameTimers.get(gameId);
  if (existing) {
    clearTimeout(existing);
    gameTimers.delete(gameId);
  }
}

/**
 * Schedules the next automated step for the game after delayMs.
 */
export function scheduleNextStep(gameId: string, delayMs: number) {
  cancelGameTimer(gameId);

  // Safe bounds: 100ms minimum to prevent CPU thrashing, max 1 hour
  const safeDelay = Math.max(100, Math.min(delayMs, 3600000));

  const timer = setTimeout(async () => {
    gameTimers.delete(gameId);
    try {
      await progressGameIfDue(gameId);
    } catch (err) {
      console.error(`[Game Orchestrator Auto-Tick Error] Game ${gameId}:`, err);
    }
  }, safeDelay);

  gameTimers.set(gameId, timer);
}

/**
 * Authoritative State Transition Orchestrator.
 * Checks whether a game round or review intermission is due to advance.
 *
 * 1. If QUESTION_ACTIVE / FINAL_ROUND and endsAt <= now:
 *    Closes the question, revealing answers and initiating a 5-second review intermission.
 * 2. If QUESTION_CLOSED and review endsAt <= now:
 *    Advances to the next question, or finalizes the game if the last question has concluded.
 *
 * Idempotent and concurrency-safe across timers, snapshot requests, and client ticks.
 */
export async function progressGameIfDue(gameId: string): Promise<boolean> {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        currentQuestionIndex: true,
        currentQuestionEndsAt: true,
        _count: {
          select: { gameQuestions: true },
        },
      },
    });

    if (!game) {
      cancelGameTimer(gameId);
      return false;
    }

    // Do nothing if game is in a non-advancing state
    if (
      game.status === "DRAFT" ||
      game.status === "LOBBY" ||
      game.status === "PAUSED" ||
      game.status === "FINISHED" ||
      game.status === "CANCELLED"
    ) {
      cancelGameTimer(gameId);
      return false;
    }

    if (!game.currentQuestionEndsAt) {
      return false;
    }

    const now = Date.now();
    const endsAtMs = new Date(game.currentQuestionEndsAt).getTime();
    const remainingMs = endsAtMs - now;

    // Phase 1: Active question round
    if (game.status === "QUESTION_ACTIVE" || game.status === "FINAL_ROUND") {
      if (remainingMs <= 0) {
        // Question timer expired! Close question and start 5-second review intermission
        const closed = await closeActiveQuestion(gameId, 5);
        if (closed) {
          scheduleNextStep(gameId, 5000);
          return true;
        }
      } else {
        // Round still active; ensure timer is scheduled for remaining time
        if (!gameTimers.has(gameId)) {
          scheduleNextStep(gameId, remainingMs);
        }
      }
      return false;
    }

    // Phase 2: Review intermission
    if (game.status === "QUESTION_CLOSED") {
      if (remainingMs <= 0) {
        const totalQuestions = game._count.gameQuestions;
        if (game.currentQuestionIndex < totalQuestions) {
          // Advance to next question!
          const adv = await advanceToNextQuestion(gameId);
          if (adv.success) {
            // Read fresh question endsAt and schedule timer
            const updated = await prisma.game.findUnique({
              where: { id: gameId },
              select: { currentQuestionEndsAt: true },
            });
            if (updated?.currentQuestionEndsAt) {
              const nextRem = Math.max(0, new Date(updated.currentQuestionEndsAt).getTime() - Date.now());
              scheduleNextStep(gameId, nextRem);
            }
            return true;
          }
        } else {
          // Final question review completed! Complete and finish game
          const fin = await finishGame(gameId);
          cancelGameTimer(gameId);
          return fin.success;
        }
      } else {
        // Review period still active; ensure timer is scheduled for remaining time
        if (!gameTimers.has(gameId)) {
          scheduleNextStep(gameId, remainingMs);
        }
      }
      return false;
    }

    return false;
  } catch (err) {
    console.warn(`[Game Orchestrator Check] Game ${gameId} warning:`, err);
    return false;
  }
}
