import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlayerGameSnapshot } from "@/lib/game/snapshot";
import { getPlayerSession } from "@/lib/auth/session";
import { generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";
import { progressGameIfDue } from "@/lib/game/game-orchestrator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const requestId = generateRequestId();
  const { gameId } = await params;

  try {
    // If due, progress question closure or review advance atomically before generating snapshot
    await progressGameIfDue(gameId);

    const session = await getPlayerSession();
    // Resolve gamePlayerId for this game from query param, session participations, or database guest token lookup
    const queryPlayerId = req.nextUrl.searchParams.get("playerId");
    const sessionPlayerId = session?.gameParticipations?.[gameId];
    let gamePlayerId = queryPlayerId || sessionPlayerId || null;

    if (!gamePlayerId && session?.guestId) {
      const existing = await prisma.gamePlayer.findUnique({
        where: {
          gameId_guestSessionToken: {
            gameId,
            guestSessionToken: session.guestId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        gamePlayerId = existing.id;
      }
    }

    const snapshot = await getPlayerGameSnapshot(gameId, gamePlayerId);

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.GAME_NOT_FOUND,
          message: "Game not found",
          requestId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: snapshot,
      requestId,
    });
  } catch (err) {
    console.error(`[Snapshot Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Failed to load game state",
        requestId,
      },
      { status: 500 }
    );
  }
}
