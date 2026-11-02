import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminGameSnapshot } from "@/lib/game/snapshot";
import { generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";
import { progressGameIfDue } from "@/lib/game/game-orchestrator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const requestId = generateRequestId();
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, code: ERROR_CODES.UNAUTHORIZED, message: "Admin authorization required", requestId },
      { status: 401 }
    );
  }

  const { gameId } = await params;

  try {
    // If due, progress question closure or round transition before returning snapshot
    await progressGameIfDue(gameId);

    const snapshot = await getAdminGameSnapshot(gameId);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, code: ERROR_CODES.GAME_NOT_FOUND, message: "Game not found", requestId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: snapshot,
      requestId,
    });
  } catch (err) {
    console.error(`[Admin Game Detail Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      { success: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to load game", requestId },
      { status: 500 }
    );
  }
}
