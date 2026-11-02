# Load Testing & Capacity Guidelines

## 1. Simulation Scenarios (Section 144)

The platform is designed to handle 260+ simultaneous active simulated players across multiple games:
- **Game A**: 80 players simultaneously submitting bets in round 5
- **Game B**: 80 players simultaneously submitting bets in round 9
- **Game C**: 100 players in lobby / round 2

## 2. Load Testing Levels & Metrics

| Tier | Simulated Players | Target P95 API Latency | Database Connections |
| :--- | :--- | :--- | :--- |
| **Tier 1** | 30 Players | < 45ms | 2–5 pooled connections |
| **Tier 2** | 80 Players | < 80ms | 5–10 pooled connections |
| **Tier 3** | 150 Players | < 120ms | 10–15 pooled connections |
| **Tier 4** | 260 Players | < 180ms | 15–20 pooled connections |

## 3. Burst Concurrency Mitigations

1. **Short Transaction Lifecycles**: Transactions only hold row locks for the duration of the balance update (< 15ms), never waiting for network calls or WebSockets.
2. **Neon Connection Pooling**: Uses Neon PgBouncer pooled connection strings (`DATABASE_URL`) to manage thousands of serverless requests without exhausting Postgres process limits.
3. **Optimistic SSE Event Broadcasting**: Realtime messages are tiny JSON payloads containing only sequence numbers and deltas, avoiding full game object broadcasts.
