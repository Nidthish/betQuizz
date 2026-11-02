import { describe, it, expect } from "vitest";

describe("Refill Engine Rules & Settlement Calculations", () => {
  it("should permit refill ONLY when balance is exactly 0", () => {
    const isRefillAllowed = (balance: number) => balance === 0;

    expect(isRefillAllowed(0)).toBe(true);
    expect(isRefillAllowed(1)).toBe(false);
    expect(isRefillAllowed(1000)).toBe(false);
    expect(isRefillAllowed(-500)).toBe(false);
  });

  it("should add 10,000 refill points and track cumulative refill fees", () => {
    let balance = 0;
    let refillCount = 0;
    let totalRefillFees = 0;

    const refillAmount = 10000;
    const refillFee = 1000;

    // First refill
    balance += refillAmount;
    refillCount += 1;
    totalRefillFees += refillFee;

    expect(balance).toBe(10000);
    expect(refillCount).toBe(1);
    expect(totalRefillFees).toBe(1000);

    // Player goes broke again
    balance = 0;

    // Second refill
    balance += refillAmount;
    refillCount += 1;
    totalRefillFees += refillFee;

    expect(balance).toBe(10000);
    expect(refillCount).toBe(2);
    expect(totalRefillFees).toBe(2000);
  });

  it("should correctly compute final settled score with refill penalties", () => {
    const playerA = {
      finalBalance: 32000,
      refillCount: 0,
      totalFees: 0,
    };

    const playerB = {
      finalBalance: 34000,
      refillCount: 3,
      totalFees: 3000,
    };

    const netScoreA = playerA.finalBalance - playerA.totalFees; // 32000 - 0 = 32000
    const netScoreB = playerB.finalBalance - playerB.totalFees; // 34000 - 3000 = 31000

    expect(netScoreA).toBe(32000);
    expect(netScoreB).toBe(31000);
    // Player A wins despite lower raw balance due to zero refill penalty!
    expect(netScoreA > netScoreB).toBe(true);
  });
});
