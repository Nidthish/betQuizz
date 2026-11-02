import { neon } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";

async function verifyNeonLive() {
  console.log("=== Testing Neon Serverless Connection ===");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  // 1. Test via @neondatabase/serverless HTTP query
  console.log("1. Testing @neondatabase/serverless HTTP driver...");
  const sql = neon(dbUrl);
  const healthCheck = await sql`SELECT NOW() as current_time, version() as pg_version`;
  console.log("Neon Server Time:", healthCheck[0].current_time);
  console.log("Neon PG Version:", healthCheck[0].pg_version);

  const gamesCount = await sql`SELECT count(*) as count FROM "games"`;
  console.log("Games in Neon DB via @neondatabase/serverless:", gamesCount[0].count);

  // 2. Test via Prisma Client
  console.log("\n2. Testing Prisma Client on Neon...");
  const prisma = new PrismaClient();
  const games = await prisma.game.findMany({
    select: { id: true, code: true, title: true, status: true, _count: { select: { gameQuestions: true } } },
  });

  console.log(`Found ${games.length} games in Neon DB via Prisma:`);
  for (const g of games) {
    console.log(` - [${g.code}] ${g.title} (${g.status}, ${g._count.gameQuestions} questions)`);
  }

  // 3. Test multi-game question query
  const questions = await prisma.question.findMany({ take: 3 });
  console.log(`\nVerified ${questions.length} sample questions in live DB:`);
  for (const q of questions) {
    console.log(` - "${q.questionText}" (Answer: ${q.correctAnswer})`);
  }

  await prisma.$disconnect();
  console.log("\n>>> LIVE NEON POSTGRESQL VERIFICATION SUCCESSFUL! <<<");
}

verifyNeonLive().catch((err) => {
  console.error("Neon verification failed:", err);
  process.exit(1);
});
