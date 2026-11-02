import { prisma } from "../db";
import { LeaderboardEntry } from "../types/game";

/**
 * Computes the authoritative server-side leaderboard for a specific game.
 * Uses deterministic tie-breaking:
 * 1. Higher net score (balance - totalRefillFees)
 * 2. Lower refill count
 * 3. More correct answers
 * 4. Earlier joined/last active timestamp
 */
export async function getGameLeaderboard(
  gameId: string,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const players = await prisma.gamePlayer.findMany({
    where: {
      gameId,
      status: { not: "REMOVED" },
    },
    select: {
      id: true,
      displayName: true,
      balance: true,
      refillCount: true,
      totalRefillFees: true,
      joinedAt: true,
      submissions: {
        where: { status: "ACCEPTED" },
        select: { isCorrect: true, submittedAt: true },
      },
    },
  });

  const formatted = players.map((p) => {
    const totalCorrect = p.submissions.filter((s) => s.isCorrect).length;
    const totalWrong = p.submissions.filter((s) => !s.isCorrect).length;
    const netScore = p.balance - p.totalRefillFees;
    const latestSubmissionTime = p.submissions.length > 0
      ? Math.max(...p.submissions.map((s) => s.submittedAt.getTime()))
      : p.joinedAt.getTime();

    return {
      gamePlayerId: p.id,
      displayName: p.displayName,
      balance: p.balance,
      totalCorrect,
      totalWrong,
      refillCount: p.refillCount,
      refillFees: p.totalRefillFees,
      netScore,
      latestSubmissionTime,
    };
  });

  // Strict deterministic sorting
  formatted.sort((a, b) => {
    // 1. Net score descending
    if (b.netScore !== a.netScore) {
      return b.netScore - a.netScore;
    }
    // 2. Refill count ascending (fewer penalties wins)
    if (a.refillCount !== b.refillCount) {
      return a.refillCount - b.refillCount;
    }
    // 3. Total correct descending
    if (b.totalCorrect !== a.totalCorrect) {
      return b.totalCorrect - a.totalCorrect;
    }
    // 4. Earlier submission/join time
    return a.latestSubmissionTime - b.latestSubmissionTime;
  });

  // Assign ranks
  const ranked: LeaderboardEntry[] = formatted.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    gamePlayerId: entry.gamePlayerId,
    displayName: entry.displayName,
    balance: entry.balance,
    totalCorrect: entry.totalCorrect,
    totalWrong: entry.totalWrong,
    refillCount: entry.refillCount,
    refillFees: entry.refillFees,
    netScore: entry.netScore,
  }));

  return ranked;
}
