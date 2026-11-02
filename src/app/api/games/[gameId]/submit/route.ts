import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submitQuestionSchema } from "@/lib/validation/schemas";
import { submitQuestionResponse } from "@/lib/game/bet-engine";
import { getPlayerSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ERROR_CODES } from "@/lib/constants";
import { generateRequestId } from "@/lib/utils/format";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const requestId = generateRequestId();
  const { gameId } = await params;

  try {
    const session = await getPlayerSession();
    const body = await req.json();

    // Player ID from body, session participations, or database guest token lookup
    const sessionPlayerId = session?.gameParticipations?.[gameId];
    let gamePlayerId = body.gamePlayerId || sessionPlayerId;

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

    if (!gamePlayerId) {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.UNAUTHORIZED,
          message: "You must join this game before submitting answers.",
          requestId,
        },
        { status: 401 }
      );
    }

    // Rate limiting submissions per player
    const rateLimit = await checkRateLimit(`submit:${gamePlayerId}`, 30, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: "Too many submission attempts. Please slow down.",
          requestId,
        },
        { status: 429 }
      );
    }

    // Validate body
    const parsed = submitQuestionSchema.safeParse({
      ...body,
      gameId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid submission parameters",
          requestId,
        },
        { status: 400 }
      );
    }

    const { questionId, selectedAnswer, betAmount, idempotencyKey, clientVersion } = parsed.data;

    // Execute atomic PostgreSQL transaction
    const result = await submitQuestionResponse({
      gameId,
      gamePlayerId,
      questionId,
      selectedAnswer,
      betAmount,
      idempotencyKey,
      clientVersion,
    });

    if (!result.success) {
      const status =
        result.code === ERROR_CODES.QUESTION_EXPIRED
          ? 400
          : result.code === ERROR_CODES.ALREADY_SUBMITTED || result.code === ERROR_CODES.DUPLICATE_BET
          ? 409
          : result.code === ERROR_CODES.INSUFFICIENT_BALANCE || result.code === ERROR_CODES.BET_ABOVE_BALANCE
          ? 400
          : result.code === ERROR_CODES.BET_BELOW_MINIMUM
          ? 400
          : result.code === ERROR_CODES.GAME_RESET
          ? 410 // 410 Gone / Session Reset
          : 400;

      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message,
          requestId,
        },
        { status }
      );
    }

    return NextResponse.json({
      ...result,
      data: result,
      requestId,
    });
  } catch (err) {
    console.error(`[Submit Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "An unexpected error occurred while processing your bet.",
        requestId,
      },
      { status: 500 }
    );
  }
}
