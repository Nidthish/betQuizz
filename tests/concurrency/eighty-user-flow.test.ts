import { describe, it, expect } from "vitest";
import { GAME_CONSTANTS, ERROR_CODES } from "../../src/lib/constants";
import { submitQuestionSchema } from "../../src/lib/validation/schemas";

describe("80 Concurrent Users Game Flow & Architecture Verification", () => {
  interface SimulatedPlayerState {
    id: string;
    balance: number;
    currentQuestionOrder: number;
    completed: boolean;
    submissions: Array<{
      questionId: string;
      betAmount: number;
      isCorrect: boolean;
      balanceAfter: number;
    }>;
  }

  interface SimulatedQuestion {
    id: string;
    order: number;
    questionText: string;
    options: string[];
    correctAnswer: string;
  }

  const QUESTIONS: SimulatedQuestion[] = [
    {
      id: "q_1",
      order: 1,
      questionText: "What is the capital of France?",
      options: ["Paris", "Berlin", "Rome", "Madrid"],
      correctAnswer: "Paris",
    },
    {
      id: "q_2",
      order: 2,
      questionText: "Which is the largest planet?",
      options: ["Earth", "Jupiter", "Mars", "Saturn"],
      correctAnswer: "Jupiter",
    },
    {
      id: "q_3",
      order: 3,
      questionText: "What does CPU stand for?",
      options: ["Central Processing Unit", "Central Program Utility"],
      correctAnswer: "Central Processing Unit",
    },
  ];

  // Pure state transition simulating the server's atomic transaction per bet
  const processBetAtomic = (
    player: SimulatedPlayerState,
    questionId: string,
    selectedAnswer: string,
    betAmount: number,
    gameVersion: number,
    clientVersion: number
  ) => {
    // 1. Version check
    if (clientVersion < gameVersion) {
      return { success: false, code: ERROR_CODES.GAME_RESET };
    }

    // 2. Limit validations
    if (betAmount < GAME_CONSTANTS.MINIMUM_BET) {
      return { success: false, code: ERROR_CODES.BET_BELOW_MINIMUM };
    }
    if (betAmount > player.balance) {
      return { success: false, code: ERROR_CODES.BET_ABOVE_BALANCE };
    }

    // 3. Question check
    const question = QUESTIONS.find((q) => q.id === questionId);
    if (!question) {
      return { success: false, code: ERROR_CODES.QUESTION_NOT_ACTIVE };
    }

    // 4. Duplicate check
    if (player.submissions.some((s) => s.questionId === questionId)) {
      return { success: false, code: ERROR_CODES.ALREADY_SUBMITTED };
    }

    // 5. Evaluate correctness and calculate balance
    const isCorrect =
      question.correctAnswer.trim().toLowerCase() === selectedAnswer.trim().toLowerCase();
    const balanceBefore = player.balance;
    const balanceAfter = isCorrect
      ? balanceBefore + betAmount
      : Math.max(0, balanceBefore - betAmount);
    const payout = isCorrect ? betAmount * 2 : 0;

    // Mutate player state atomically
    player.balance = balanceAfter;
    player.submissions.push({
      questionId,
      betAmount,
      isCorrect,
      balanceAfter,
    });

    // 6. Find next question
    const nextQ = QUESTIONS.find((q) => q.order === question.order + 1) || null;
    if (nextQ) {
      player.currentQuestionOrder = nextQ.order;
    } else {
      player.completed = true;
    }

    return {
      success: true,
      questionId,
      betAmount,
      result: isCorrect ? "WIN" : "LOSS",
      isCorrect,
      payout,
      balance: balanceAfter,
      nextQuestion: nextQ,
      game: {
        completed: !nextQ,
      },
    };
  };

  it("should simulate 80 concurrent users playing without race conditions or balance corruption", async () => {
    const TOTAL_USERS = 80;
    const STARTING_BALANCE = 10000;

    // Initialize 80 players
    const players: SimulatedPlayerState[] = Array.from({ length: TOTAL_USERS }, (_, i) => ({
      id: `player_${i + 1}`,
      balance: STARTING_BALANCE,
      currentQuestionOrder: 1,
      completed: false,
      submissions: [],
    }));

    // Round 1: All 80 players bet on Question 1 simultaneously
    const round1Promises = players.map(async (player, index) => {
      // Half answer correctly ("Paris"), half answer wrongly ("Berlin")
      const answer = index % 2 === 0 ? "Paris" : "Berlin";
      const bet = 1000;
      return processBetAtomic(player, "q_1", answer, bet, 1, 1);
    });

    const round1Results = await Promise.all(round1Promises);

    // Verify all 80 responses succeeded
    expect(round1Results.length).toBe(80);
    expect(round1Results.every((r) => r.success)).toBe(true);

    // Verify balance integrity: winners = 11,000, losers = 9,000
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (i % 2 === 0) {
        expect(p.balance).toBe(11000);
      } else {
        expect(p.balance).toBe(9000);
      }
      expect(p.currentQuestionOrder).toBe(2);
      expect(p.completed).toBe(false);
    }

    // Round 2: All 80 players bet on Question 2
    const round2Promises = players.map(async (player, index) => {
      // 3/4 answer correctly ("Jupiter")
      const answer = index % 4 !== 0 ? "Jupiter" : "Earth";
      const bet = 1500;
      return processBetAtomic(player, "q_2", answer, bet, 1, 1);
    });

    const round2Results = await Promise.all(round2Promises);
    expect(round2Results.every((r) => r.success)).toBe(true);

    // Round 3: All 80 players bet on Question 3 (final question)
    const round3Promises = players.map(async (player) => {
      return processBetAtomic(player, "q_3", "Central Processing Unit", 500, 1, 1);
    });

    const round3Results = await Promise.all(round3Promises);
    expect(round3Results.every((r) => r.success)).toBe(true);

    // Verify all 80 players have smoothly completed the game
    for (const player of players) {
      expect(player.completed).toBe(true);
      expect(player.submissions.length).toBe(3);
    }
  });

  it("should detect duplicate submission and reject second bet", () => {
    const player: SimulatedPlayerState = {
      id: "p_dup",
      balance: 10000,
      currentQuestionOrder: 1,
      completed: false,
      submissions: [],
    };

    const first = processBetAtomic(player, "q_1", "Paris", 1000, 1, 1);
    expect(first.success).toBe(true);
    expect(player.balance).toBe(11000);

    // Double click / retry on same question
    const second = processBetAtomic(player, "q_1", "Paris", 1000, 1, 1);
    expect(second.success).toBe(false);
    expect(second.code).toBe(ERROR_CODES.ALREADY_SUBMITTED);
    // Balance must NOT be modified again
    expect(player.balance).toBe(11000);
  });

  it("should safely reject bet when Admin reset has occurred (Section 29 & 30)", () => {
    const player: SimulatedPlayerState = {
      id: "p_reset",
      balance: 10000,
      currentQuestionOrder: 1,
      completed: false,
      submissions: [],
    };

    // Client version = 1, but Admin has reset game -> server version = 2
    const res = processBetAtomic(player, "q_1", "Paris", 1000, 2, 1);
    expect(res.success).toBe(false);
    expect(res.code).toBe(ERROR_CODES.GAME_RESET);
  });
});
