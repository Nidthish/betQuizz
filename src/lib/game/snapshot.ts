import { prisma } from "../db";
import { AuthoritativeGameSnapshot, AdminGameSnapshot, SanitizedQuestion } from "../types/game";
import { getGameLeaderboard } from "./leaderboard-engine";
import { GAME_CONSTANTS } from "../constants";

/**
 * Builds the player-facing authoritative game snapshot.
 * Synchronized with the active round timer.
 * Correct answer and outcome are revealed ONLY when question is closed or game is finished.
 */
export async function getPlayerGameSnapshot(
  gameId: string,
  gamePlayerId?: string | null
): Promise<AuthoritativeGameSnapshot | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      version: true,
      currentQuestionId: true,
      currentQuestionIndex: true,
      currentQuestionStartedAt: true,
      currentQuestionEndsAt: true,
      startingBalance: true,
      refillAmount: true,
      refillFee: true,
      _count: {
        select: {
          gameQuestions: true,
          players: true,
        },
      },
    },
  });

  if (!game) return null;

  const totalQuestions = game._count.gameQuestions;
  const currentIdx = game.currentQuestionIndex || 1;
  const isQuestionClosed = game.status === "QUESTION_CLOSED" || game.status === "FINISHED";

  let sanitizedQuestion: SanitizedQuestion | null = null;

  if (game.currentQuestionId) {
    const activeGQ = await prisma.gameQuestion.findUnique({
      where: {
        gameId_questionId: {
          gameId,
          questionId: game.currentQuestionId,
        },
      },
      include: { question: true },
    });

    if (activeGQ) {
      const q = activeGQ.question;
      sanitizedQuestion = {
        id: q.id,
        questionText: q.questionText,
        options: q.options as string[],
        timeLimit: q.timeLimit,
        order: activeGQ.order,
        category: q.category,
        // Only reveal correct answer and explanation after question countdown has ended!
        correctAnswer: isQuestionClosed ? q.correctAnswer : undefined,
        explanation: isQuestionClosed ? q.explanation : undefined,
      };
    }
  } else if (game.status === "LOBBY" && totalQuestions > 0) {
    const firstGQ = await prisma.gameQuestion.findFirst({
      where: { gameId },
      orderBy: { order: "asc" },
      include: { question: true },
    });
    if (firstGQ) {
      sanitizedQuestion = {
        id: firstGQ.question.id,
        questionText: firstGQ.question.questionText,
        options: firstGQ.question.options as string[],
        timeLimit: firstGQ.question.timeLimit,
        order: firstGQ.order,
        category: firstGQ.question.category,
      };
    }
  }

  // Load player-specific authoritative state
  let playerData: AuthoritativeGameSnapshot["player"] = null;
  if (gamePlayerId) {
    const p = await prisma.gamePlayer.findUnique({
      where: { id: gamePlayerId },
      include: {
        submissions: {
          include: { question: true },
          orderBy: { submittedAt: "asc" },
        },
      },
    });

    if (p) {
      const currentSub = game.currentQuestionId
        ? p.submissions.find((s: any) => s.questionId === game.currentQuestionId)
        : null;

      const totalWins = p.submissions.filter((s: any) => s.isCorrect).length;
      const totalLosses = p.submissions.filter((s: any) => !s.isCorrect && s.selectedAnswer !== "UNANSWERED").length;
      const totalWagered = p.submissions.reduce((sum: number, s: any) => sum + s.betAmount, 0);
      const netResult = p.balance - game.startingBalance;

      const hasSubmitted = Boolean(currentSub && currentSub.selectedAnswer !== "UNANSWERED");

      playerData = {
        id: p.id,
        displayName: p.displayName,
        balance: p.balance,
        status: p.status,
        refillCount: p.refillCount,
        totalRefillFees: p.totalRefillFees,
        submittedCurrentQuestion: hasSubmitted,
        lastSubmission: currentSub
          ? {
              selectedAnswer: currentSub.selectedAnswer,
              betAmount: currentSub.betAmount,
              // Only reveal win/loss and balance after the round countdown has closed!
              isCorrect: isQuestionClosed ? currentSub.isCorrect : undefined,
              balanceAfter: isQuestionClosed ? currentSub.balanceAfter : undefined,
            }
          : null,
        totalWins,
        totalLosses,
        totalWagered,
        netResult,
        isCompleted: game.status === "FINISHED",
      };
    }
  }

  // Leaderboard is only needed on the final scoreboard; avoid heavy DB load during active rounds
  const leaderboard =
    game.status === "FINISHED" ? await getGameLeaderboard(gameId, 50) : [];

  // Mark if player is in the leaderboard
  if (playerData && leaderboard.length > 0) {
    for (const entry of leaderboard) {
      if (entry.gamePlayerId === playerData.id) {
        entry.isCurrentPlayer = true;
      }
    }
  }

  return {
    gameId: game.id,
    gameCode: game.code,
    title: game.title,
    status: game.status,
    version: game.version,
    sequenceNumber: game.version,
    currentQuestionIndex: currentIdx,
    totalQuestions,
    currentQuestion: sanitizedQuestion,
    questionStartedAt: game.currentQuestionStartedAt?.toISOString() ?? null,
    questionEndsAt: game.currentQuestionEndsAt?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
    player: playerData,
    leaderboard,
    totalPlayers: game._count.players,
    isCompleted: game.status === "FINISHED",
    rules: {
      startingBalance: game.startingBalance,
      refillAmount: game.refillAmount,
      refillFee: game.refillFee,
      minBet: GAME_CONSTANTS.MINIMUM_BET,
    },
  };
}

/**
 * Builds the Admin game snapshot with full question metadata and submission counters.
 */
export async function getAdminGameSnapshot(gameId: string): Promise<AdminGameSnapshot | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
      players: {
        select: { id: true, status: true },
      },
    },
  });

  if (!game) return null;

  // Single fast COUNT query instead of pulling all submission records into memory
  const submissionCount = game.currentQuestionId
    ? await prisma.questionSubmission.count({
        where: {
          gameId,
          questionId: game.currentQuestionId,
        },
      })
    : 0;

  const totalQuestions = game.gameQuestions.length;
  let activeQuestion: AdminGameSnapshot["currentQuestion"] = null;

  if (game.currentQuestionId) {
    const activeGQ = game.gameQuestions.find((gq: any) => gq.questionId === game.currentQuestionId);
    if (activeGQ) {
      const q = activeGQ.question;
      activeQuestion = {
        id: q.id,
        questionText: q.questionText,
        options: q.options as string[],
        timeLimit: q.timeLimit,
        order: activeGQ.order,
        category: q.category,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    }
  }

  const leaderboard = await getGameLeaderboard(gameId, 100);
  const totalPlayers = game.players.length;
  const activePlayers = game.players.filter((p: any) => p.status === "ACTIVE").length;
  const unsubmittedCount = Math.max(0, activePlayers - submissionCount);

  const questionsList = game.gameQuestions.map((gq: any) => ({
    id: gq.question.id,
    gameQuestionId: gq.id,
    order: gq.order,
    questionText: gq.question.questionText,
    options: gq.question.options as string[],
    timeLimit: gq.question.timeLimit,
    correctAnswer: gq.question.correctAnswer,
    explanation: gq.question.explanation,
  }));

  return {
    gameId: game.id,
    gameCode: game.code,
    title: game.title,
    status: game.status,
    version: game.version,
    sequenceNumber: game.version,
    currentQuestionIndex: game.currentQuestionIndex,
    totalQuestions,
    currentQuestion: activeQuestion,
    questions: questionsList,
    questionStartedAt: game.currentQuestionStartedAt?.toISOString() ?? null,
    questionEndsAt: game.currentQuestionEndsAt?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
    totalPlayers,
    activePlayers,
    submissionCount,
    unsubmittedCount,
    leaderboard,
    rules: {
      startingBalance: game.startingBalance,
      refillAmount: game.refillAmount,
      refillFee: game.refillFee,
    },
  };
}
