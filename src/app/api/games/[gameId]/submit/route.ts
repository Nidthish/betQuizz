import { NextRequest, NextResponse } from "next/server";
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

    // Player ID from session participations or request
    const sessionPlayerId = session?.gameParticipations?.[gameId];
    const gamePlayerId = body.gamePlayerId || sessionPlayerId;

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

    const { questionId, selectedAnswer, betAmount, idempotencyKey } = parsed.data;

    // Execute atomic PostgreSQL transaction
    const result = await submitQuestionResponse({
      gameId,
      gamePlayerId,
      questionId,
      selectedAnswer,
      betAmount,
      idempotencyKey,
    });

    if (!result.success) {
      const status =
        result.code === ERROR_CODES.QUESTION_EXPIRED
          ? 400
          : result.code === ERROR_CODES.ALREADY_SUBMITTED
          ? 409
          : result.code === ERROR_CODES.INSUFFICIENT_BALANCE
          ? 400
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
      success: true,
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
