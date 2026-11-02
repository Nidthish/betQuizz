# Deployment Guide (Next.js on Vercel + Neon PostgreSQL)

## 1. Prerequisites

1. A **Neon PostgreSQL** database project (free tier or paid serverless compute).
2. A **Vercel** account for hosting the Next.js application.

## 2. Environment Variables Configuration

Set these environment variables in your Vercel Project Settings:

```env
# Neon Pooled Connection URL (Used for API serverless queries)
DATABASE_URL="postgresql://[user]:[password]@[neon-pooler-host]/[dbname]?sslmode=require&pgbouncer=true"

# Neon Direct Connection URL (Used for Prisma migrations)
DIRECT_URL="postgresql://[user]:[password]@[neon-host]/[dbname]?sslmode=require"

# JWT Auth Secret (Generate using: openssl rand -base64 32)
AUTH_SECRET="your-secure-random-secret-key-min-32-chars-long"

# Application URL
NEXT_PUBLIC_APP_URL="https://your-quiz-app.vercel.app"

# Node Environment
NODE_ENV="production"

# Default Admin Credentials for initial setup
ADMIN_DEFAULT_EMAIL="admin@quizbetting.com"
ADMIN_DEFAULT_PASSWORD="YourStrongAdminPassword123!"
```

## 3. Database Migration & Seeding

Run migrations against your Neon database:

```bash
# Push schema directly to Neon
npx prisma db push

# (Optional) Seed demo games and admin account
npx tsx prisma/seed.ts
```

## 4. Vercel Deployment

Deploy with one command using the Vercel CLI:

```bash
vercel --prod
```

Or connect your GitHub repository directly to Vercel for continuous integration and automated preview branch databases.
