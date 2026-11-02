import { prisma } from "../db";
import { AuthoritativeGameSnapshot, AdminGameSnapshot, SanitizedQuestion } from "../types/game";
import { getGameLeaderboard } from "./leaderboard-engine";

/**
 * Builds the player-facing authoritative game snapshot.
 * Correct answer is strictly redacted unless question is closed or game is finished.
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
  const currentIdx = game.currentQuestionIndex;

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
      const isQuestionClosed = game.status === "QUESTION_CLOSED" || game.status === "FINISHED";

      sanitizedQuestion = {
        id: q.id,
        questionText: q.questionText,
        options: q.options as string[],
        timeLimit: q.timeLimit,
        order: activeGQ.order,
        category: q.category,
        // Only reveal correct answer after question is closed!
        correctAnswer: isQuestionClosed ? q.correctAnswer : undefined,
        explanation: isQuestionClosed ? q.explanation : undefined,
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
          where: { questionId: game.currentQuestionId ?? "" },
          take: 1,
        },
      },
    });

    if (p) {
      const currentSub = p.submissions[0];
      playerData = {
        id: p.id,
        displayName: p.displayName,
        balance: p.balance,
        status: p.status,
        refillCount: p.refillCount,
        totalRefillFees: p.totalRefillFees,
        submittedCurrentQuestion: Boolean(currentSub && currentSub.selectedAnswer !== "UNANSWERED"),
        lastSubmission: currentSub
          ? {
              selectedAnswer: currentSub.selectedAnswer,
              betAmount: currentSub.betAmount,
              isCorrect:
                game.status === "QUESTION_CLOSED" || game.status === "FINISHED"
                  ? currentSub.isCorrect
                  : undefined,
              balanceAfter:
                game.status === "QUESTION_CLOSED" || game.status === "FINISHED"
                  ? currentSub.balanceAfter
                  : undefined,
            }
          : null,
      };
    }
  }

  const leaderboard = await getGameLeaderboard(gameId, 50);

  // Mark if player is in the leaderboard
  if (playerData) {
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
    rules: {
      startingBalance: game.startingBalance,
      refillAmount: game.refillAmount,
      refillFee: game.refillFee,
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
    const activeGQ = game.gameQuestions.find((gq) => gq.questionId === game.currentQuestionId);
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
  const activePlayers = game.players.filter((p) => p.status === "ACTIVE").length;
  const unsubmittedCount = Math.max(0, activePlayers - submissionCount);

  const questionsList = game.gameQuestions.map((gq) => ({
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
