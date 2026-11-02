"use server";

import { neon } from "@neondatabase/serverless";

/**
 * Returns a serverless Neon SQL client.
 * Credentials are kept strictly secure on the server.
 */
function getNeonClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }
  return neon(dbUrl);
}

/**
 * Health check server action proving end-to-end Neon connection
 */
export async function getNeonHealth() {
  try {
    const sql = getNeonClient();
    const result = await sql`SELECT NOW() as server_time, version() as pg_version`;
    return {
      success: true,
      serverTime: result[0]?.server_time,
      version: result[0]?.pg_version,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Fast aggregate server action using @neondatabase/serverless
 */
export async function getPlatformSummary() {
  try {
    const sql = getNeonClient();
    const counts = await sql`
      SELECT 
        (SELECT count(*) FROM "games") as total_games,
        (SELECT count(*) FROM "game_players") as total_players,
        (SELECT count(*) FROM "question_submissions") as total_bets
    `;

    return {
      success: true,
      stats: {
        totalGames: Number(counts[0]?.total_games ?? 0),
        totalPlayers: Number(counts[0]?.total_players ?? 0),
        totalBets: Number(counts[0]?.total_bets ?? 0),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}
