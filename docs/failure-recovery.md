# Failure Recovery & Resilience

## 1. Network Disconnections & Wi-Fi Drops

When a player's client loses connection:
1. `useGameRealtime` hook transitions connection status to `"reconnecting"` or `"offline"`.
2. A non-intrusive status banner alerts the player that game actions are paused.
3. The hook automatically executes exponential backoff retries with jitter.
4. Upon reconnect, it triggers `resync()` to fetch the authoritative database snapshot `/api/games/[gameId]/snapshot`.

## 2. Browser Refresh / F5 Recovery

If a player refreshes their browser during an active round:
- The server checks the player's HTTP-only session cookie.
- It restores:
  - Game code and title
  - Current question and options
  - Time remaining calculated from server `questionEndsAt`
  - Authoritative balance
  - Submission status (whether the player already submitted for this round)
  - Leaderboard rankings

## 3. Vercel Instance Re-Routing

If subsequent HTTP requests land on a different Vercel serverless function instance:
- The system functions with 100% correctness because **no authoritative state is held in process memory**.
- Prisma connection pooling reuses established connections to Neon.
- Database transactions ensure state changes are immediately visible to all instances.

## 4. Idempotent Retry on Network Timeout

If a submission request experiences an upstream network timeout after hitting the server:
- The client's retry carries the identical `idempotencyKey`.
- The server detects the key in `idempotency_keys` and returns the previously committed result without executing duplicate balance updates.
