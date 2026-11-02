# Testing Strategy & Automated Test Suite

## 1. Test Suite Architecture

Automated tests are written with **Vitest**:
- `tests/unit/betting-engine.test.ts`: Validates points calculation (+ bet for correct, - bet for wrong), maximum bet bounds, and server timer grace period.
- `tests/unit/refill-engine.test.ts`: Validates zero-balance rule, 10,000 refill points deposit, and 1,000 final deduction penalties.
- `tests/unit/leaderboard-tiebreak.test.ts`: Validates deterministic tie-breaking (net score, refill count, accuracy, timestamp).
- `tests/isolation/multi-game-isolation.test.ts`: Validates multi-game balance isolation and IDOR cross-game request rejection.
- `tests/concurrency/idempotency.test.ts`: Validates that 10 simultaneous duplicate requests result in exactly one database transaction.

## 2. Running Automated Tests

```bash
# Run unit and isolation tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```
