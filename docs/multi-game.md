# Multi-Game Concurrency & Architecture

## 1. Multi-Game Overview

The platform supports hundreds of independent quiz games operating concurrently on the same Next.js and Neon PostgreSQL infrastructure.

Example:
- **Game A** (Code: `ABC123`): 80 players, Round 5 of 15, Status: `QUESTION_ACTIVE`
- **Game B** (Code: `XYZ789`): 60 players, Round 8 of 10, Status: `QUESTION_CLOSED`
- **Game C** (Code: `QWE456`): 100 players, Lobby, Status: `LOBBY`

## 2. Multi-Game Isolation Guarantees

1. **Balance Isolation**:
   Balances belong strictly to `GamePlayer.balance`, never `User.balance`. A player participating in Game A with 18,000 points and Game B with 7,500 points has two independent balance ledgers.
2. **Question Isolation**:
   Questions are scoped by `gameId` via the `game_questions` join table.
3. **Timer Isolation**:
   Every game owns its own `currentQuestionStartedAt` and `currentQuestionEndsAt`.
4. **Leaderboard Isolation**:
   Leaderboard queries filter strictly by `WHERE gameId = $1`.
5. **Realtime Isolation**:
   SSE streams are scoped by URL `/api/games/[gameId]/events`. Events from Game A never broadcast to Game B listeners.

## 3. Player Game Switching

Players can participate in multiple concurrent games without logging out. The `MultiGameDrawer` component allows instant switching between active rooms.
