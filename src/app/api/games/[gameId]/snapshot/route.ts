import { NextRequest, NextResponse } from "next/server";
import { getPlayerGameSnapshot } from "@/lib/game/snapshot";
import { getPlayerSession } from "@/lib/auth/session";
import { progressGameIfDue } from "@/lib/game/game-orchestrator";
import { generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const requestId = generateRequestId();
  const { gameId } = await params;

  try {
    // Authoritatively auto-advance question or review period if time has elapsed
    await progressGameIfDue(gameId);

    const session = await getPlayerSession();
    // Resolve gamePlayerId for this game from session participations or query param
    const queryPlayerId = req.nextUrl.searchParams.get("playerId");
    const sessionPlayerId = session?.gameParticipations?.[gameId];
    const gamePlayerId = queryPlayerId || sessionPlayerId || null;

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
