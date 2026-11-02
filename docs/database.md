# Database Architecture & Schema Specification

Authoritative source of truth: **Neon Serverless PostgreSQL** via **Prisma ORM**.

## 1. Relational Entity Diagram

```
[User] (Admins / Authenticated)
  |
  +-- [Game] (Multi-Game Authority)
  |     |
  |     +-- [GameQuestion] ---- [Question] (Reusable Question Bank)
  |     |
  |     +-- [GamePlayer]
  |     |     |
  |     |     +-- [QuestionSubmission] (Unique per Player/Question)
  |     |     |     |
  |     |     |     +-- [Bet] (Financial Audit Trail)
  |     |     |
  |     |     +-- [Refill] (Audit Records for Zero-Balance Refills)
  |     |     |
  |     |     +-- [GameResult] (Final Settle & Rank)
  |     |
  |     +-- [GameEvent] (Monotonic Event Stream for SSE & Audit)
  |
[IdempotencyKey] (Scoped Deduplication)
[RateLimitRecord] (Cross-Instance Rate Limiting)
```

## 2. Table Specifications

### `users`
- Stores administrative staff and optional registered users.
- Role: `ADMIN` | `PLAYER`.

### `games`
- Master authoritative table for all game rooms.
- Columns: `id`, `code` (Unique alphanumeric e.g. `ABC123`), `title`, `status`, `startingBalance` (default 10,000), `refillAmount` (default 10,000), `refillFee` (default 1,000), `currentQuestionId`, `currentQuestionIndex`, `currentQuestionStartedAt`, `currentQuestionEndsAt`, `startedAt`, `endedAt`, `version`.
- Indexes: `code`, `status`, `createdAt`.

### `questions` & `game_questions`
- Questions can be reused across games without duplicating content.
- Unique constraint: `(gameId, order)` and `(gameId, questionId)`.

### `game_players`
- Holds a player's independent balance and status in a specific game.
- Unique constraint: `(gameId, guestSessionToken)` prevents duplicate participation.
- Row-level locked during submissions and refills via `SELECT ... FOR UPDATE`.

### `question_submissions`
- Records player answer and bet amount atomically.
- **Unique constraint: `(gamePlayerId, questionId)`** guarantees at the database level that a player can NEVER submit more than one answer/bet for any question.

### `bets` & `refills`
- Immutably audited transactions for financial tracking and analytics.

### `game_events`
- Event log with sequential numbers (`sequenceNumber`) for SSE real-time streaming, reconnect catchup, and state verification.

### `idempotency_keys`
- Stores processed response payloads keyed by `(key, scope)` with automated TTL expiration.
