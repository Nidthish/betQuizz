import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { joinGameSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getPlayerSession, setPlayerSession } from "@/lib/auth/session";
import { emitGameEvent } from "@/lib/game/event-bus";
import { ERROR_CODES } from "@/lib/constants";
import { generateRequestId, sanitizeText } from "@/lib/utils/format";
import { nanoid } from "nanoid";
import { isValidMascotId, DEFAULT_MASCOT_ID } from "@/lib/constants/mascots";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Rate limiting join attempts by IP
  const rateLimit = await checkRateLimit(`join:${ip}`, 20, 60000);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: "Too many join attempts. Please slow down.",
        requestId,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = joinGameSchema.safeParse(body);

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

    const { code, displayName, avatarId } = parsed.data;
    const cleanName = sanitizeText(displayName, 25);
    const cleanAvatarId = avatarId && isValidMascotId(avatarId) ? avatarId : DEFAULT_MASCOT_ID;

    // Look up game by authoritative unique code
    const game = await prisma.game.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        startingBalance: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.GAME_NOT_FOUND,
          message: `Game with code "${code}" does not exist.`,
          requestId,
        },
        { status: 404 }
      );
    }

    // Check if game is in a joinable state
    if (game.status === "FINISHED" || game.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.GAME_NOT_JOINABLE,
          message: "This game has already ended.",
          requestId,
        },
        { status: 400 }
      );
    }

    // Resolve or generate guest session token
    let session = await getPlayerSession();
    let guestId = session?.guestId;
    if (!guestId) {
      guestId = `gst_${nanoid(16)}`;
    }

    // Check if player has already joined this game
    let gamePlayer = await prisma.gamePlayer.findUnique({
      where: {
        gameId_guestSessionToken: {
          gameId: game.id,
          guestSessionToken: guestId,
        },
      },
    });

    if (gamePlayer) {
      // Re-joining existing game participation: update last seen, display name, and avatar if provided
      gamePlayer = await prisma.gamePlayer.update({
        where: { id: gamePlayer.id },
        data: {
          lastSeenAt: new Date(),
          status: gamePlayer.status === "DISCONNECTED" ? "RECONNECTED" : gamePlayer.status,
          ...(avatarId ? { avatarId: cleanAvatarId } : {}),
        },
      });
    } else {
      // New participation creation
      gamePlayer = await prisma.$transaction(async (tx: any) => {
        const newPlayer = await tx.gamePlayer.create({
          data: {
            gameId: game.id,
            guestSessionToken: guestId,
            displayName: cleanName,
            avatarId: cleanAvatarId,
            balance: game.startingBalance,
            status: game.status === "DRAFT" || game.status === "LOBBY" ? "WAITING" : "ACTIVE",
          },
        });

        // Emit PLAYER_JOINED event
        await emitGameEvent(tx, {
          gameId: game.id,
          gamePlayerId: newPlayer.id,
          eventType: "PLAYER_JOINED",
          payload: {
            playerId: newPlayer.id,
            displayName: cleanName,
            avatarId: cleanAvatarId,
          },
        });

        return newPlayer;
      });
    }

    if (!gamePlayer) {
      return NextResponse.json(
        { success: false, message: "Failed to join game", requestId },
        { status: 500 }
      );
    }

    // Update player's session cookie with this game participation
    const participations = session?.gameParticipations ?? {};
    participations[game.id] = gamePlayer.id;

    await setPlayerSession({
      guestId,
      displayName: cleanName,
      gameParticipations: participations,
    });

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        gameCode: game.code,
        gameTitle: game.title,
        gameStatus: game.status,
        gamePlayerId: gamePlayer.id,
        displayName: gamePlayer.displayName,
        avatarId: cleanAvatarId,
        balance: gamePlayer.balance,
      },
      requestId,
    });
  } catch (err) {
    console.error(`[JoinGame Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Failed to join game. Please try again.",
        requestId,
      },
      { status: 500 }
    );
  }
}
