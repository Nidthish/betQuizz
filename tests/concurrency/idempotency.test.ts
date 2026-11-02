import { describe, it, expect } from "vitest";

describe("Idempotency Engine & Concurrency Control", () => {
  interface MockIdempotencyStore {
    [key: string]: {
      responsePayload: unknown;
      expiresAt: number;
    };
  }

  it("should process the first mutation and return cached response on 10 duplicate attempts", () => {
    const store: MockIdempotencyStore = {};
    let transactionCount = 0;

    const executeWithIdempotency = (
      idempotencyKey: string,
      operation: () => { success: boolean; newBalance: number }
    ) => {
      // 1. Check cache
      if (store[idempotencyKey]) {
        return { isDuplicate: true, data: store[idempotencyKey].responsePayload };
      }

      // 2. Perform authoritative transaction
      transactionCount++;
      const result = operation();

      // 3. Store result
      store[idempotencyKey] = {
        responsePayload: result,
        expiresAt: Date.now() + 60000,
      };

      return { isDuplicate: false, data: result };
    };

    const idempotencyKey = "idem_sub_q1_p1_unique";
    const mutation = () => ({ success: true, newBalance: 15000 });

    // 1st request -> executed
    const firstCall = executeWithIdempotency(idempotencyKey, mutation);
    expect(firstCall.isDuplicate).toBe(false);
    expect(firstCall.data).toEqual({ success: true, newBalance: 15000 });
    expect(transactionCount).toBe(1);

    // 9 subsequent identical requests (e.g. rapid double-clicks / network retries)
    for (let i = 0; i < 9; i++) {
      const retryCall = executeWithIdempotency(idempotencyKey, mutation);
      expect(retryCall.isDuplicate).toBe(true);
      expect(retryCall.data).toEqual({ success: true, newBalance: 15000 });
    }

    // Crucial check: Authoritative transaction count MUST strictly remain 1!
    expect(transactionCount).toBe(1);
  });
});
