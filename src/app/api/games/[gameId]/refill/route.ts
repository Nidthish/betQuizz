import { NextRequest, NextResponse } from "next/server";
import { refillSchema } from "@/lib/validation/schemas";
import { executePlayerRefill } from "@/lib/game/refill-engine";
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

    const sessionPlayerId = session?.gameParticipations?.[gameId];
    const gamePlayerId = body.gamePlayerId || sessionPlayerId;

    if (!gamePlayerId) {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Player identification required.",
          requestId,
        },
        { status: 401 }
      );
    }

    const rateLimit = await checkRateLimit(`refill:${gamePlayerId}`, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: "Too many refill attempts. Please wait.",
          requestId,
        },
        { status: 429 }
      );
    }

    const parsed = refillSchema.safeParse({
      ...body,
      gameId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid refill request",
          requestId,
        },
        { status: 400 }
      );
    }

    const { idempotencyKey } = parsed.data;

    const result = await executePlayerRefill({
      gameId,
      gamePlayerId,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          message: result.message,
          requestId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      requestId,
    });
  } catch (err) {
    console.error(`[Refill Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Refill processing failed.",
        requestId,
      },
      { status: 500 }
    );
  }
}
