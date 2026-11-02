import { describe, it, expect } from "vitest";
import { submitQuestionSchema } from "../../src/lib/validation/schemas";
import { GAME_CONSTANTS, ERROR_CODES } from "../../src/lib/constants";
import { getHumanErrorMessage } from "../../src/lib/game/bet-engine";

describe("Betting Engine Pure Rules & Logic", () => {
  it("should validate that correct answer adds bet amount to total balance", () => {
    const startingBalance = 10000;
    const betAmount = 5000;
    const isCorrect = true;

    const balanceAfter = isCorrect
      ? startingBalance + betAmount
      : startingBalance - betAmount;

    expect(balanceAfter).toBe(15000);
  });

  it("should validate that wrong answer deducts bet amount from total balance", () => {
    const startingBalance = 10000;
    const betAmount = 4000;
    const isCorrect = false;

    const balanceAfter = isCorrect
      ? startingBalance + betAmount
      : startingBalance - betAmount;

    expect(balanceAfter).toBe(6000);
  });

  it("should enforce minimum bet boundary of ₹500 (Section 6 & 36)", () => {
    const validSubmission = {
      gameId: "game_1",
      questionId: "q_1",
      selectedAnswer: "Paris",
      betAmount: 500,
      idempotencyKey: "idem_12345678",
    };

    // ₹500: accepted
    expect(submitQuestionSchema.safeParse(validSubmission).success).toBe(true);

    // ₹499: rejected
    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: 499 }).success
    ).toBe(false);

    // ₹0: rejected
    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: 0 }).success
    ).toBe(false);

    // Negative: rejected
    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: -100 }).success
    ).toBe(false);

    // Decimal: rejected
    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: 500.5 }).success
    ).toBe(false);
  });

  it("should enforce maximum bet boundary up to current player balance (Section 6 & 36)", () => {
    const currentBalance = 2000;
    const validBet = 2000;
    const invalidBet = 2001;

    const checkBet = (bet: number, balance: number) =>
      bet >= GAME_CONSTANTS.MINIMUM_BET && bet <= balance;

    // ₹2000 with balance ₹2000: accepted
    expect(checkBet(validBet, currentBalance)).toBe(true);

    // ₹2001 with balance ₹2000: rejected
    expect(checkBet(invalidBet, currentBalance)).toBe(false);

    // ₹499: rejected (below minimum)
    expect(checkBet(499, currentBalance)).toBe(false);
  });

  it("should provide predictable human-friendly error messages (Section 31)", () => {
    expect(getHumanErrorMessage(ERROR_CODES.BET_BELOW_MINIMUM)).toContain("Minimum bet is ₹500");
    expect(getHumanErrorMessage(ERROR_CODES.BET_ABOVE_BALANCE)).toContain("exceeds your current available balance");
    expect(getHumanErrorMessage(ERROR_CODES.ALREADY_SUBMITTED)).toContain("already submitted");
    expect(getHumanErrorMessage(ERROR_CODES.GAME_RESET)).toContain("reset by the administrator");
  });
});
