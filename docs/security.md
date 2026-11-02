# Security & Hardening Specification

## 1. Authentication & Cookie Sessions

- **Admin Authentication**:
  - Secure bcrypt-hashed passwords.
  - JWT tokens signed with HMAC-SHA256 (`HS256`) via Edge-compatible `jose`.
  - Stored in `httpOnly`, `sameSite: "lax"`, and `secure: true` (in production) cookies.
- **Player Identification**:
  - Unique guest session token (`guestId`) issued in an HTTP-only cookie.
  - Independent participation mapping (`gameParticipations[gameId] = gamePlayerId`).

## 2. Insecure Direct Object Reference (IDOR) Protection

- A player authorized in Game A (`ABC123`) can never read or mutate private player data in Game B (`XYZ789`).
- Every mutation validates `gamePlayer.gameId === targetGameId`.

## 3. Rate Limiting

Rate limiting is enforced at two layers:
1. Fast in-memory token bucket per Vercel function instance.
2. Cross-instance database tracking via `rate_limit_records` table in PostgreSQL.
- Join game attempts: Max 20 attempts per IP per minute.
- Submissions: Max 30 attempts per player per minute.
- Refills: Max 5 attempts per player per minute.
- Admin login: Max 5 attempts per IP per minute.

## 4. Input Sanitization & XSS Prevention

- All user-supplied text (player nicknames, question text) is sanitized using `sanitizeText()` to strip HTML markup `<>` and control characters.
- React renders text nodes with automatic escaping; `dangerouslySetInnerHTML` is prohibited.

## 5. Information Leakage Prevention

- While a question is active (`QUESTION_ACTIVE` or `FINAL_ROUND`), the `correctAnswer` is strictly redacted from player snapshots and SSE event payloads.
- Correct answers and explanations are revealed only after the question transitions to `QUESTION_CLOSED` or `FINISHED`.
- Error messages never expose database stack traces; clients receive structured error codes (`requestId`, `code`, `message`).
