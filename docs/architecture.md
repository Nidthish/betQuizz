# Quiz Betting Game - System Architecture

## 1. High-Level Overview

Quiz Betting Game is a production-ready, multi-game realtime quiz platform built on Next.js 15, TypeScript, Tailwind CSS, Prisma ORM, and Neon Serverless PostgreSQL. It delivers high-stakes multiplayer quiz wagering with authoritative server-side state, strictly preventing cheating, double-spending, or timer spoofing.

```
                         INTERNET
                            |
             +--------------+--------------+
             |                             |
             v                             v
        PLAYER CLIENT                 ADMIN CLIENT
        (Web / Mobile)                (Game Host)
             |                             |
             +--------------+--------------+
                            |
                            v
                    NEXT.JS MONOLITH (Vercel)
                            |
          +-----------------+------------------+
          |                 |                  |
          v                 v                  v
       UI LAYER          API LAYER        REALTIME LAYER
    (React Server &   (Zod Validated,    (Server-Sent Events +
    Client Components) HTTP-only Auth)     Postgres Event Log)
          |                 |                  |
          +-----------------+------------------+
                            |
                            v
                      GAME DOMAIN
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
         Game Engine   Bet Engine   Leaderboard
         (Transitions)  (ACID Bet)   (Tie-Break)
              |             |             |
              +-------------+-------------+
                            |
                            v
                    NEON POSTGRESQL
                 AUTHORITATIVE DATABASE
```

---

## 2. Core Architectural Principles

1. **PostgreSQL is the Authoritative Source of Truth:**
   No in-memory game state (`Map<gameId, state>`), no global variables, and no Redis dependencies. Every Vercel serverless function instance is stateless and loads authoritative game state directly from Neon PostgreSQL with connection pooling.
2. **Multi-Game Isolation:**
   Multiple independent games (e.g. `ABC123`, `XYZ789`, `QWE456`) run simultaneously. A player can play in multiple games concurrently; their balances and scores are completely isolated by `(gameId, gamePlayerId)`.
3. **Atomic Balance Mutations:**
   Submissions (answering + betting) are processed as a single atomic operation using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside transactions (`prisma.$transaction`).
4. **Authoritative Server Timer:**
   The server determines timestamps (`questionStartedAt`, `questionEndsAt`). The client only displays the visual countdown. Submissions beyond `questionEndsAt + SUBMISSION_GRACE_PERIOD_MS` are rejected.
5. **Realtime without Redis:**
   Realtime updates use Server-Sent Events (SSE) with sequence catch-up and PostgreSQL event log polling (`GameEvent` table). Reconnection automatically queries the latest snapshot (`/api/games/[gameId]/snapshot`).
