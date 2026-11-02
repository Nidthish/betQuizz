import { prisma } from "../src/lib/db";

async function cleanDummyData() {
  console.log("Cleaning up dummy demo games from Neon PostgreSQL...");

  // Delete demo games ABC123, XYZ789, QWE456
  const deleted = await prisma.game.deleteMany({
    where: {
      code: { in: ["ABC123", "XYZ789", "QWE456"] },
    },
  });

  console.log(`Deleted ${deleted.count} dummy games from database.`);
  await prisma.$disconnect();
}

cleanDummyData().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
