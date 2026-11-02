# Game State Machine & Lifecycle

## 1. Authoritative State Machine

The Quiz Betting Game engine adheres to a strict finite state machine (FSM). Invalid state transitions are rejected by PostgreSQL transactions.

```
       [DRAFT]
          |
          v (Admin opens room)
       [LOBBY]
          |
          v (Admin clicks Start Game)
    [QUESTION_ACTIVE] <-------------+
          |                         |
          v (Timer ends / Closed)   | (Next Question)
    [QUESTION_CLOSED] --------------+
          |
          v (Last Question)
     [FINAL_ROUND]
          |
          v (Timer ends / Closed)
       [FINISHED]
```

## 2. Supported States

- **`DRAFT`**: Game created, questions can be added or reordered. Players cannot join yet.
- **`LOBBY`**: Game open for players to enter code, submit nickname, and join waiting room.
- **`QUESTION_ACTIVE`**: Live round in progress. Server countdown running. Submissions (answer + bet) accepted.
- **`QUESTION_CLOSED`**: Submissions stopped. Correct answer revealed to players. Real-time balance changes displayed.
- **`FINAL_ROUND`**: Special high-stakes final question with double bonus potential.
- **`FINISHED`**: Final settlements computed (`balance - totalFees`). Rankings stored to `game_results`. No further submissions or refills permitted.
- **`PAUSED`**: Temporary host hold state. Timer calculations frozen.
