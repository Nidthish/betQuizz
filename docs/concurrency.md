# Concurrency, Transactions & Anti-Double-Spending

## 1. Concurrency Problem Statement

In a live quiz room with 100+ players submitting bets simultaneously within milliseconds:
- Players must never be able to bet more than their current balance.
- Rapid double-clicks or multiple browser tabs must never produce double submissions.
- Race conditions during zero-balance refill requests must result in exactly one successful refill.

## 2. PostgreSQL ACID Transaction Model

All balance-changing mutations are encapsulated in `prisma.$transaction`:

```
BEGIN TRANSACTION;
  1. Authoritative Game State Validation
     Verify game status is QUESTION_ACTIVE / FINAL_ROUND.
     Verify currentQuestionId matches.
     Verify current time <= questionEndsAt + SUBMISSION_GRACE_PERIOD_MS.

  2. Row-Level Locking
     SELECT "id", "balance", "version"
     FROM "game_players"
     WHERE "id" = $1 AND "gameId" = $2
     FOR UPDATE;

  3. Duplicate Submission Check
     Check if (gamePlayerId, questionId) exists in question_submissions.

  4. Bet Bounds Validation
     Assert 1 <= betAmount <= currentBalance.

  5. Business Rule Calculation
     isCorrect ? balance + betAmount : balance - betAmount.

  6. Write Mutations
     - Update GamePlayer balance & version
     - Insert QuestionSubmission
     - Insert Bet audit record
     - Insert GameEvent record

  7. Persist Idempotency Key
COMMIT;
```

## 3. Database Constraints as Safety Nets

Even if a software race condition bypasses application logic:
- `UNIQUE INDEX (gamePlayerId, questionId)` on `question_submissions` enforces at the database storage engine that duplicate submissions for the same question will fail with a unique constraint violation error (SQL 23505).
- `UNIQUE INDEX (key, scope)` on `idempotency_keys` prevents double processing.
- `UNIQUE INDEX (gameId, guestSessionToken)` prevents multiple registrations.
