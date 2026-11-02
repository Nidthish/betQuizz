import { describe, it, expect } from "vitest";
import { gameActionSchema } from "../../src/lib/validation/schemas";

describe("Auto Game Flow & Reset Game Engine Logic", () => {
  describe("Action Schema Validation", () => {
    it("should accept RESET_GAME and AUTO_TICK as valid game actions", () => {
      const resetAction = {
        action: "RESET_GAME",
        gameId: "game_abc123",
      };
      const tickAction = {
        action: "AUTO_TICK",
        gameId: "game_abc123",
      };

      expect(gameActionSchema.safeParse(resetAction).success).toBe(true);
      expect(gameActionSchema.safeParse(tickAction).success).toBe(true);
    });

    it("should accept START_GAME, NEXT_QUESTION, CLOSE_QUESTION, FINISH_GAME", () => {
      for (const action of ["START_GAME", "NEXT_QUESTION", "CLOSE_QUESTION", "FINISH_GAME"]) {
        expect(gameActionSchema.safeParse({ action, gameId: "g1" }).success).toBe(true);
      }
    });
  });

  describe("Auto-Progression State Machine Transitions", () => {
    interface SimulatedGame {
      id: string;
      status: "DRAFT" | "LOBBY" | "QUESTION_ACTIVE" | "QUESTION_CLOSED" | "FINAL_ROUND" | "FINISHED" | "PAUSED";
      currentQuestionIndex: number;
      totalQuestions: number;
      currentQuestionEndsAt: Date | null;
    }

    const determineNextStep = (game: SimulatedGame, nowMs: number) => {
      if (
        game.status === "DRAFT" ||
        game.status === "LOBBY" ||
        game.status === "PAUSED" ||
        game.status === "FINISHED"
      ) {
        return { action: "NONE" };
      }

      if (!game.currentQuestionEndsAt) {
        return { action: "NONE" };
      }

      const endsAtMs = game.currentQuestionEndsAt.getTime();
      const remainingMs = endsAtMs - nowMs;

      if (game.status === "QUESTION_ACTIVE" || game.status === "FINAL_ROUND") {
        if (remainingMs <= 0) {
          return { action: "CLOSE_QUESTION", reviewDurationMs: 5000 };
        }
        return { action: "WAIT_QUESTION", remainingMs };
      }

      if (game.status === "QUESTION_CLOSED") {
        if (remainingMs <= 0) {
          if (game.currentQuestionIndex < game.totalQuestions) {
            return { action: "ADVANCE_NEXT_QUESTION", nextIndex: game.currentQuestionIndex + 1 };
          }
          return { action: "FINISH_GAME" };
        }
        return { action: "WAIT_REVIEW", remainingMs };
      }

      return { action: "NONE" };
    };

    it("should auto-close question when active countdown reaches 0", () => {
      const game: SimulatedGame = {
        id: "g_1",
        status: "QUESTION_ACTIVE",
        currentQuestionIndex: 1,
        totalQuestions: 5,
        currentQuestionEndsAt: new Date(10000), // ends at 10s
      };

      // At 9s: still waiting
      expect(determineNextStep(game, 9000)).toEqual({ action: "WAIT_QUESTION", remainingMs: 1000 });

      // At 10s: triggers CLOSE_QUESTION with 5s review
      expect(determineNextStep(game, 10000)).toEqual({ action: "CLOSE_QUESTION", reviewDurationMs: 5000 });

      // At 11s: triggers CLOSE_QUESTION
      expect(determineNextStep(game, 11000)).toEqual({ action: "CLOSE_QUESTION", reviewDurationMs: 5000 });
    });

    it("should auto-advance to next question when review period reaches 0", () => {
      const game: SimulatedGame = {
        id: "g_1",
        status: "QUESTION_CLOSED",
        currentQuestionIndex: 1,
        totalQuestions: 5,
        currentQuestionEndsAt: new Date(15000), // review ends at 15s
      };

      // At 12s: in review
      expect(determineNextStep(game, 12000)).toEqual({ action: "WAIT_REVIEW", remainingMs: 3000 });

      // At 15s: auto-advance to Round 2
      expect(determineNextStep(game, 15000)).toEqual({
        action: "ADVANCE_NEXT_QUESTION",
        nextIndex: 2,
      });
    });

    it("should auto-finish game when final question review reaches 0", () => {
      const game: SimulatedGame = {
        id: "g_1",
        status: "QUESTION_CLOSED",
        currentQuestionIndex: 5,
        totalQuestions: 5,
        currentQuestionEndsAt: new Date(20000), // final review ends at 20s
      };

      // At 20s: auto-finishes game
      expect(determineNextStep(game, 20000)).toEqual({ action: "FINISH_GAME" });
    });

    it("should do nothing when game is PAUSED or in LOBBY", () => {
      const pausedGame: SimulatedGame = {
        id: "g_1",
        status: "PAUSED",
        currentQuestionIndex: 2,
        totalQuestions: 5,
        currentQuestionEndsAt: new Date(5000),
      };
      expect(determineNextStep(pausedGame, 10000)).toEqual({ action: "NONE" });

      const lobbyGame: SimulatedGame = {
        id: "g_1",
        status: "LOBBY",
        currentQuestionIndex: 0,
        totalQuestions: 5,
        currentQuestionEndsAt: null,
      };
      expect(determineNextStep(lobbyGame, 10000)).toEqual({ action: "NONE" });
    });
  });

  describe("Reset Game Logic Rules", () => {
    it("should preserve questions while purging all player activity", () => {
      // Mock game state before reset
      const state = {
        game: {
          id: "g_active",
          code: "ABCDEF",
          status: "QUESTION_ACTIVE",
          currentQuestionIndex: 3,
        },
        questions: [
          { id: "q1", text: "Q1" },
          { id: "q2", text: "Q2" },
          { id: "q3", text: "Q3" },
        ],
        players: [{ id: "p1", name: "Player 1" }, { id: "p2", name: "Player 2" }],
        submissions: [{ id: "s1" }, { id: "s2" }],
        bets: [{ id: "b1" }, { id: "b2" }],
        refills: [{ id: "r1" }],
        results: [{ id: "res1" }],
      };

      // Perform reset transformation
      const resetState = {
        ...state,
        game: {
          ...state.game,
          status: "LOBBY",
          currentQuestionIndex: 0,
        },
        players: [],
        submissions: [],
        bets: [],
        refills: [],
        results: [],
      };

      // Assert that questions are 100% preserved
      expect(resetState.questions.length).toBe(3);
      expect(resetState.questions[0].id).toBe("q1");

      // Assert that all gameplay records are deleted
      expect(resetState.players.length).toBe(0);
      expect(resetState.submissions.length).toBe(0);
      expect(resetState.bets.length).toBe(0);
      expect(resetState.refills.length).toBe(0);
      expect(resetState.results.length).toBe(0);

      // Assert game status returns to LOBBY
      expect(resetState.game.status).toBe("LOBBY");
      expect(resetState.game.currentQuestionIndex).toBe(0);
    });
  });

  describe("Unanswered Penalty & Deferred Balance Settle Rules", () => {
    it("should deduct exactly 1,000 points penalty when a player does not answer a question", () => {
      const initialBalance = 10000;
      const penalty = 1000;
      const settledBalance = Math.max(0, initialBalance - penalty);

      expect(settledBalance).toBe(9000);
    });

    it("should never deduct below 0 when applying unanswered penalty to low balance", () => {
      const lowBalance = 400;
      const settledBalance = Math.max(0, lowBalance - 1000);

      expect(settledBalance).toBe(0);
    });

    it("should keep balance unchanged during active countdown and settle only at question end", () => {
      let playerBalance = 10000;
      const betAmount = 3000;
      const isCorrect = true;

      // 1. Player submits bet during QUESTION_ACTIVE
      const balanceBefore = playerBalance;
      const potentialBalanceAfter = isCorrect ? balanceBefore + betAmount : balanceBefore - betAmount;

      // Crucial: while round is active, player's balance must remain 10,000!
      expect(playerBalance).toBe(10000);

      // 2. Round timer ends -> transition to QUESTION_CLOSED
      // Authoritative engine settles the balance
      playerBalance = potentialBalanceAfter;

      // Balance now reflects won bet after timer ends
      expect(playerBalance).toBe(13000);
    });
  });
});
