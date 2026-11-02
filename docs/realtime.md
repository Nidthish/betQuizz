# Neon Database Polling Architecture (WebSocket-Free)

## 1. Simplified Architecture Decision

All WebSockets, Server-Sent Events (SSE), and long-lived streaming connection routes have been **completely eliminated** from the platform.

### Why:
- **Serverless Reliability**: Vercel functions are stateless and ephemeral. Long-lived streaming routes (such as SSE keeping a 20+ second connection open) consume unnecessary execution duration and complicate connection lifecycle.
- **Neon Direct Authority**: Neon PostgreSQL is the single authoritative source of truth. Every client fetches state directly via standard HTTP snapshot requests.
- **Zero Socket Hanging**: Standard HTTP `GET` requests complete in milliseconds (`~30ms - 50ms`), eliminating socket drops, reconnect storms, and proxy timeouts.

## 2. Synchronization Strategy

### A. Player Clients (`useGameRealtime.ts`)
- **Direct HTTP Polling**: Requests `/api/games/[gameId]/snapshot`.
- **Adaptive Cadence**:
  - `1.5s` when a question is active (`QUESTION_ACTIVE` or `FINAL_ROUND`).
  - `2.0s` when in waiting room (`LOBBY` / `DRAFT`).
  - `4.0s` when game is completed (`FINISHED`).
- **Smart Pause**: Polling automatically pauses when the browser tab is hidden/minimized to preserve bandwidth, and immediately fires a fresh fetch the instant the tab is focused again.
- **Action-Triggered Refetch**: Submitting an answer or claiming a refill triggers an instant refetch from Neon without waiting for the poll cycle.

### B. Host Admin Dashboard (`useAdminRealtime.ts`)
- Polls `/api/admin/games/[gameId]` every `2.0s`.
- Instant refetch triggered whenever the host executes an action (`Start Game`, `Next Round`, `Close Question`, `Add Question`).
