import { describe, it, expect } from "vitest";

describe("Deterministic Leaderboard Tie-Breaking", () => {
  interface PlayerMock {
    id: string;
    netScore: number;
    refillCount: number;
    totalCorrect: number;
    lastSubmissionTime: number;
  }

  function sortLeaderboard(players: PlayerMock[]): PlayerMock[] {
    return [...players].sort((a, b) => {
      // 1. Net score descending
      if (b.netScore !== a.netScore) {
        return b.netScore - a.netScore;
      }
      // 2. Refill count ascending (fewer penalties wins)
      if (a.refillCount !== b.refillCount) {
        return a.refillCount - b.refillCount;
      }
      // 3. More correct answers descending
      if (b.totalCorrect !== a.totalCorrect) {
        return b.totalCorrect - a.totalCorrect;
      }
      // 4. Earlier submission timestamp ascending
      return a.lastSubmissionTime - b.lastSubmissionTime;
    });
  }

  it("should break ties using refill count when net score is equal", () => {
    const players: PlayerMock[] = [
      { id: "p1", netScore: 25000, refillCount: 2, totalCorrect: 5, lastSubmissionTime: 100 },
      { id: "p2", netScore: 25000, refillCount: 0, totalCorrect: 5, lastSubmissionTime: 200 },
    ];

    const ranked = sortLeaderboard(players);
    expect(ranked[0].id).toBe("p2"); // p2 has 0 refills vs 2 refills
  });

  it("should break ties using accuracy when net score and refills are equal", () => {
    const players: PlayerMock[] = [
      { id: "p1", netScore: 25000, refillCount: 1, totalCorrect: 6, lastSubmissionTime: 300 },
      { id: "p2", netScore: 25000, refillCount: 1, totalCorrect: 8, lastSubmissionTime: 300 },
    ];

    const ranked = sortLeaderboard(players);
    expect(ranked[0].id).toBe("p2"); // p2 has 8 correct answers vs 6
  });

  it("should break ties using earlier timestamp when all metrics are equal", () => {
    const players: PlayerMock[] = [
      { id: "p_later", netScore: 20000, refillCount: 0, totalCorrect: 5, lastSubmissionTime: 5000 },
      { id: "p_earlier", netScore: 20000, refillCount: 0, totalCorrect: 5, lastSubmissionTime: 2000 },
    ];

    const ranked = sortLeaderboard(players);
    expect(ranked[0].id).toBe("p_earlier");
  });
});
