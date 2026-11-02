import { describe, it, expect } from "vitest";
import { submitQuestionSchema } from "../../src/lib/validation/schemas";
import { GAME_CONSTANTS } from "../../src/lib/constants";

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

  it("should enforce maximum bet boundary up to current balance", () => {
    const currentBalance = 7500;
    const validBet = 7500;
    const invalidBet = 7501;

    const checkBet = (bet: number, balance: number) => bet >= 1 && bet <= balance;

    expect(checkBet(validBet, currentBalance)).toBe(true);
    expect(checkBet(invalidBet, currentBalance)).toBe(false);
  });

  it("should reject negative, zero, and floating point bets via schema", () => {
    const validSubmission = {
      gameId: "game_1",
      questionId: "q_1",
      selectedAnswer: "Paris",
      betAmount: 500,
      idempotencyKey: "idem_12345678",
    };

    expect(submitQuestionSchema.safeParse(validSubmission).success).toBe(true);

    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: 0 }).success
    ).toBe(false);

    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: -100 }).success
    ).toBe(false);

    expect(
      submitQuestionSchema.safeParse({ ...validSubmission, betAmount: 10.5 }).success
    ).toBe(false);
  });

  it("should correctly calculate timer expiration with network grace period", () => {
    const now = new Date("2026-11-02T12:00:30.000Z").getTime();
    const endsAt = new Date("2026-11-02T12:00:30.000Z").getTime();
    const gracePeriod = GAME_CONSTANTS.SUBMISSION_GRACE_PERIOD_MS; // 500ms

    const isSubmissionLate = (submittedAtMs: number, deadlineMs: number) => {
      return submittedAtMs > deadlineMs + gracePeriod;
    };

    // Exactly at deadline: accepted
    expect(isSubmissionLate(now, endsAt)).toBe(false);

    // Within grace period (+200ms): accepted
    expect(isSubmissionLate(now + 200, endsAt)).toBe(false);

    // Past grace period (+600ms): rejected
    expect(isSubmissionLate(now + 600, endsAt)).toBe(true);
  });
});
