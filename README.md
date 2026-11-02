# Quiz Betting Game - Multi-Game Realtime Quiz Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-Serverless-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Tests](https://img.shields.io/badge/Tests-14%20Passed-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev)

A production-grade, multi-game realtime quiz wagering platform designed from the ground up for high concurrency, zero double-spending, and multi-game data isolation without Redis.

---

## 🚀 Key Features & Architectural Highlights

- **Multi-Game Concurrency**: Run hundreds of independent games simultaneously (e.g. `ABC123`, `XYZ789`, `QWE456`). State, questions, balances, and leaderboards are 100% isolated.
- **Authoritative Database Authority**: No global variables or in-memory game state. State is persisted to **Neon PostgreSQL** and fully recoverable across serverless instance reboots.
- **Atomic Wagering Engine**: Submitting an answer and a bet is an ACID transaction with PostgreSQL row-level locking (`SELECT ... FOR UPDATE`), strictly preventing double-spending or negative balances.
- **Server-Authoritative Countdown Timer**: Server controls start and cutoff timestamps (`questionStartedAt`, `questionEndsAt`). Client countdown timers are visual displays; submissions past deadline are rejected.
- **Realtime without Redis**: Realtime event stream powered by Server-Sent Events (SSE) with sequence catch-up and event log polling against the database, enabling seamless multi-instance Vercel deployment.
- **Zero-Balance Refill System**: Refill feature allowed *strictly* when balance reaches 0 (+10,000 points deposit, with a 1,000 point penalty deducted during final settlement).
- **Player Multi-Game Switching**: Players can join multiple concurrent games with independent bankrolls and switch between them seamlessly.
- **Host Admin Control Center**: Real-time host controls for opening lobbies, launching questions, closing rounds, pausing/resuming, and viewing live submission counters and leaderboards.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Next.js Server-Side Route Handlers, Zod Validation, Jose JWT Authentication
- **Database**: Neon Serverless PostgreSQL with Connection Pooling
- **ORM**: Prisma Client v6
- **Realtime**: Server-Sent Events (SSE) + Database Monotonic Event Streams
- **Testing**: Vitest with unit, isolation, and concurrency suites
- **Deployment**: Single Next.js monolith targeted for Vercel + Neon

---

## 📁 Project Structure

```text
├── docs/                      # Architectural & System Documentation
│   ├── architecture.md        # High-level architecture diagram and design
│   ├── database.md            # Schema, entities, and index specifications
│   ├── game-state-machine.md  # Finite state machine transitions
│   ├── concurrency.md         # Row-level locking & ACID transactions
│   ├── realtime.md            # Realtime SSE model without Redis
│   ├── security.md            # Auth, rate limiting, and IDOR protection
│   ├── failure-recovery.md    # Reconnection, refresh, and timeout recovery
│   ├── multi-game.md          # Multi-game concurrency and isolation
│   ├── testing.md             # Automated test suite guide
│   ├── load-testing.md        # Capacity benchmarks and 260-player load test
│   └── deployment.md          # Vercel and Neon setup guide
├── prisma/
│   ├── schema.prisma          # PostgreSQL database schema
│   └── seed.ts                # Database seeder with demo games and admin
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── admin/             # Host admin console & game manager
│   │   ├── api/               # Serverless API endpoints
│   │   │   ├── admin/         # Game action orchestration & question builder
│   │   │   ├── games/         # Join, snapshot, SSE stream, bet submit, refill
│   │   │   └── player/        # Multi-game player profile & active games
│   │   ├── game/[code]/       # Live player game screen
│   │   ├── layout.tsx         # Global layout & metadata
│   │   └── page.tsx           # Landing page & join flow
│   ├── components/            # Reusable UI & modal components
│   │   └── common/            # Navbar, drawers, banners, bonus modals
│   └── lib/                   # Core business logic engines
│       ├── auth/              # JWT cookie session manager
│       ├── game/              # Game engine, betting, refill, leaderboard, SSE
│       ├── hooks/             # Realtime SSE & authoritative timer hooks
│       ├── security/          # Rate limiting & token bucket
│       ├── types/             # Strong TypeScript interfaces
│       ├── utils/             # Formatters & game code generators
│       └── validation/        # Zod input schemas
└── tests/                     # Vitest test suite
    ├── concurrency/           # Idempotency & duplicate submission tests
    ├── isolation/             # Multi-game data isolation tests
    └── unit/                  # Betting, refill, and tie-breaking tests
```

---

## 🚦 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` with your Neon PostgreSQL connection string:
```env
DATABASE_URL="postgresql://[user]:[password]@[neon-hostname]/neondb?sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@[neon-host]/neondb?sslmode=require"
AUTH_SECRET="your-32-character-secret-key"
```

### 3. Initialize Database & Seed Demo Games
```bash
# Push schema to Neon PostgreSQL
npx prisma db push

# Seed demo games (ABC123, XYZ789, QWE456) and Admin account
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Run the automated test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 🎮 Default Credentials for Instant Testing

- **Admin Email**: `admin@quizbetting.com`
- **Admin Password**: `AdminPassword123!`
- **Demo Game Room A**: `ABC123` (Tech & Trivia)
- **Demo Game Room B**: `XYZ789` (World Championship)
- **Demo Game Room C**: `QWE456` (Science & Space)
