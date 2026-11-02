import { NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateRequestId } from "@/lib/utils/format";

export async function GET() {
  const requestId = generateRequestId();

  try {
    const session = await getPlayerSession();
    if (!session || !session.guestId) {
      return NextResponse.json({
        success: true,
        data: [],
        requestId,
      });
    }

    // Find all game players associated with this guest session
    const participations = await prisma.gamePlayer.findMany({
      where: {
        guestSessionToken: session.guestId,
      },
      include: {
        game: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            currentQuestionIndex: true,
          },
        },
      },
      orderBy: {
        lastSeenAt: "desc",
      },
    });

    const games = participations.map((p) => ({
      gamePlayerId: p.id,
      gameId: p.game.id,
      gameCode: p.game.code,
      title: p.game.title,
      status: p.game.status,
      balance: p.balance,
      refillCount: p.refillCount,
      currentQuestionIndex: p.game.currentQuestionIndex,
      lastSeenAt: p.lastSeenAt,
    }));

    return NextResponse.json({
      success: true,
      data: games,
      requestId,
    });
  } catch (err) {
    console.error(`[Player Games Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message: "Failed to load player games list",
        requestId,
      },
      { status: 500 }
    );
  }
}
