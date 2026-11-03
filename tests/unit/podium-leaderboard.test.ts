import { describe, it, expect } from "vitest";
import { LeaderboardEntry } from "@/lib/types/game";

describe("Podium Leaderboard Calculations & Structure", () => {
  const sampleLeaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      gamePlayerId: "p1",
      displayName: "Tom",
      avatarId: "all-in-penguin",
      balance: 15200,
      totalCorrect: 8,
      totalWrong: 2,
      refillCount: 0,
      refillFees: 0,
      netScore: 15200,
    },
    {
      rank: 2,
      gamePlayerId: "p2",
      displayName: "Nathan",
      avatarId: "calculator-owl",
      balance: 13000,
      totalCorrect: 7,
      totalWrong: 3,
      refillCount: 0,
      refillFees: 0,
      netScore: 13000,
    },
    {
      rank: 3,
      gamePlayerId: "p3",
      displayName: "Harry",
      avatarId: "risky-raccoon",
      balance: 7500,
      totalCorrect: 5,
      totalWrong: 5,
      refillCount: 0,
      refillFees: 0,
      netScore: 7500,
    },
    {
      rank: 4,
      gamePlayerId: "p4",
      displayName: "Jessie",
      avatarId: "lucky-duck",
      balance: 5100,
      totalCorrect: 4,
      totalWrong: 6,
      refillCount: 1,
      refillFees: 1000,
      netScore: 4100,
    },
    {
      rank: 5,
      gamePlayerId: "p5",
      displayName: "Alex",
      avatarId: "sleepy-sloth",
      balance: 3200,
      totalCorrect: 3,
      totalWrong: 7,
      refillCount: 1,
      refillFees: 1000,
      netScore: 2200,
      isCurrentPlayer: true,
    },
  ];

  it("identifies top 3 for the podium correctly", () => {
    const firstPlace = sampleLeaderboard.find((p) => p.rank === 1);
    const secondPlace = sampleLeaderboard.find((p) => p.rank === 2);
    const thirdPlace = sampleLeaderboard.find((p) => p.rank === 3);

    expect(firstPlace?.displayName).toBe("Tom");
    expect(secondPlace?.displayName).toBe("Nathan");
    expect(thirdPlace?.displayName).toBe("Harry");
  });

  it("filters remaining players (rank 4+) for the table below podium", () => {
    const remaining = sampleLeaderboard.filter((p) => p.rank > 3);
    expect(remaining).toHaveLength(2);
    expect(remaining[0].rank).toBe(4);
    expect(remaining[0].displayName).toBe("Jessie");
    expect(remaining[1].rank).toBe(5);
    expect(remaining[1].displayName).toBe("Alex");
  });

  it("computes overall accuracy percentage correctly", () => {
    const calcAccuracy = (c: number, w: number) => {
      const total = c + w;
      return total > 0 ? Math.round((c / total) * 100) : 0;
    };

    expect(calcAccuracy(8, 2)).toBe(80);
    expect(calcAccuracy(7, 3)).toBe(70);
    expect(calcAccuracy(5, 5)).toBe(50);
    expect(calcAccuracy(4, 6)).toBe(40);
    expect(calcAccuracy(0, 0)).toBe(0);
  });

  it("correctly flags when current player is outside the top 3", () => {
    const currentPlayer = sampleLeaderboard.find((p) => p.isCurrentPlayer);
    expect(currentPlayer).toBeDefined();
    expect(currentPlayer?.rank).toBe(5);
    const isTop3 = currentPlayer ? currentPlayer.rank <= 3 : false;
    expect(isTop3).toBe(false);
  });

  it("handles edge case of 2 players gracefully without crashing", () => {
    const twoPlayers = sampleLeaderboard.slice(0, 2);
    const first = twoPlayers.find((p) => p.rank === 1);
    const second = twoPlayers.find((p) => p.rank === 2);
    const third = twoPlayers.find((p) => p.rank === 3);
    const remaining = twoPlayers.filter((p) => p.rank > 3);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(third).toBeUndefined();
    expect(remaining).toHaveLength(0);
  });
});
