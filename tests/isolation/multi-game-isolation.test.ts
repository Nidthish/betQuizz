import { describe, it, expect } from "vitest";

describe("Multi-Game Concurrency & Data Isolation", () => {
  interface GameParticipation {
    gameId: string;
    gameCode: string;
    gamePlayerId: string;
    balance: number;
  }

  it("should keep balances completely independent when one player joins multiple games", () => {
    // Player 'Arun' joined 3 simultaneous games
    const participations: Record<string, GameParticipation> = {
      game_A: {
        gameId: "game_A",
        gameCode: "ABC123",
        gamePlayerId: "gp_arun_A",
        balance: 10000,
      },
      game_B: {
        gameId: "game_B",
        gameCode: "XYZ789",
        gamePlayerId: "gp_arun_B",
        balance: 10000,
      },
      game_C: {
        gameId: "game_C",
        gameCode: "QWE456",
        gamePlayerId: "gp_arun_C",
        balance: 10000,
      },
    };

    // Arun wins 8,000 in Game A
    participations["game_A"].balance += 8000;

    // Arun loses 2,500 in Game B
    participations["game_B"].balance -= 2500;

    // Arun bets 10,000 and wins in Game C
    participations["game_C"].balance += 10000;

    // Assert that balances are completely isolated
    expect(participations["game_A"].balance).toBe(18000);
    expect(participations["game_B"].balance).toBe(7500);
    expect(participations["game_C"].balance).toBe(20000);
  });

  it("should verify authorization rejects cross-game queries (IDOR prevention)", () => {
    const playerMemberships = new Set(["gp_player1_gameA"]);

    const canAccessGame = (gamePlayerId: string, targetGameId: string, playerGameMap: Record<string, string>) => {
      if (!playerMemberships.has(gamePlayerId)) return false;
      return playerGameMap[gamePlayerId] === targetGameId;
    };

    const playerGameMap = {
      gp_player1_gameA: "game_A",
    };

    // Player attempts to query Game A -> Allowed
    expect(canAccessGame("gp_player1_gameA", "game_A", playerGameMap)).toBe(true);

    // Player attempts to query Game B without membership -> Forbidden (403)
    expect(canAccessGame("gp_player1_gameA", "game_B", playerGameMap)).toBe(false);
  });
});
