import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/session";
import { createGameSchema } from "@/lib/validation/schemas";
import { generateGameCode, generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";

// GET /api/admin/games - List all games with live statistics
export async function GET() {
  const requestId = generateRequestId();
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, code: ERROR_CODES.UNAUTHORIZED, message: "Admin authorization required", requestId },
      { status: 401 }
    );
  }

  try {
    const games = await prisma.game.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            players: true,
            gameQuestions: true,
          },
        },
        players: {
          select: { status: true },
        },
      },
    });

    const formatted = games.map((g) => {
      const activePlayers = g.players.filter((p) => p.status === "ACTIVE").length;
      return {
        id: g.id,
        code: g.code,
        title: g.title,
        status: g.status,
        startingBalance: g.startingBalance,
        refillAmount: g.refillAmount,
        refillFee: g.refillFee,
        currentQuestionIndex: g.currentQuestionIndex,
        totalQuestions: g._count.gameQuestions,
        totalPlayers: g._count.players,
        activePlayers,
        createdAt: g.createdAt,
        startedAt: g.startedAt,
        endedAt: g.endedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      requestId,
    });
  } catch (err) {
    console.error(`[Admin Games GET Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      { success: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to fetch games", requestId },
      { status: 500 }
    );
  }
}

// POST /api/admin/games - Create new game
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, code: ERROR_CODES.UNAUTHORIZED, message: "Admin authorization required", requestId },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = createGameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input",
          requestId,
        },
        { status: 400 }
      );
    }

    const { title, startingBalance, refillAmount, refillFee } = parsed.data;

    // Generate collision-free unique game code
    let code = generateGameCode();
    let collision = await prisma.game.findUnique({ where: { code } });
    let attempts = 0;
    while (collision && attempts < 10) {
      code = generateGameCode();
      collision = await prisma.game.findUnique({ where: { code } });
      attempts++;
    }

    const game = await prisma.game.create({
      data: {
        code,
        title,
        status: "DRAFT",
        startingBalance,
        refillAmount,
        refillFee,
        createdById: session.userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: game,
      requestId,
    });
  } catch (err) {
    console.error(`[Admin Games POST Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      { success: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to create game", requestId },
      { status: 500 }
    );
  }
}
