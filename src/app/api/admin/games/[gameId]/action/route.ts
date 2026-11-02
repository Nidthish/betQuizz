import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { gameActionSchema } from "@/lib/validation/schemas";
import {
  openGameLobby,
  startGame,
  closeActiveQuestion,
  advanceToNextQuestion,
  finishGame,
  resetGame,
} from "@/lib/game/game-engine";
import {
  scheduleNextStep,
  cancelGameTimer,
  progressGameIfDue,
} from "@/lib/game/game-orchestrator";
import { prisma } from "@/lib/db";
import { emitGameEvent } from "@/lib/game/event-bus";
import { generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";

export async function POST(
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
    const body = await req.json();
    const parsed = gameActionSchema.safeParse({ ...body, gameId });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid game action",
          requestId,
        },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    switch (action) {
      case "OPEN_LOBBY": {
        await openGameLobby(gameId);
        return NextResponse.json({ success: true, action, message: "Lobby opened for players", requestId });
      }

      case "START_GAME": {
        const res = await startGame(gameId);
        if (!res.success) {
          return NextResponse.json(
            { success: false, code: res.code, message: "Could not start game", requestId },
            { status: 400 }
          );
        }
        // Kick off the automated 1-by-1 question progression
        await progressGameIfDue(gameId);
        return NextResponse.json({ success: true, action, message: "Game started with automated progression", requestId });
      }

      case "CLOSE_QUESTION": {
        await closeActiveQuestion(gameId, 5);
        scheduleNextStep(gameId, 5000);
        return NextResponse.json({ success: true, action, message: "Question closed", requestId });
      }

      case "NEXT_QUESTION": {
        const res = await advanceToNextQuestion(gameId);
        if (!res.success) {
          if (res.isLastQuestion) {
            // Automatically or cleanly prompt to finish
            return NextResponse.json(
              {
                success: false,
                code: "LAST_QUESTION_FINISHED",
                message: "All questions have ended. You can now finalize the game.",
                requestId,
              },
              { status: 200 }
            );
          }
          return NextResponse.json(
            { success: false, code: res.code, message: "Could not advance question", requestId },
            { status: 400 }
          );
        }
        await progressGameIfDue(gameId);
        return NextResponse.json({ success: true, action, isLastQuestion: res.isLastQuestion, requestId });
      }

      case "RESET_GAME": {
        cancelGameTimer(gameId);
        const res = await resetGame(gameId);
        if (!res.success) {
          return NextResponse.json(
            { success: false, code: res.code, message: res.message || "Could not reset game", requestId },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          action,
          message: res.message || "Game reset successfully",
          requestId,
        });
      }

      case "AUTO_TICK": {
        const progressed = await progressGameIfDue(gameId);
        return NextResponse.json({ success: true, action, progressed, requestId });
      }

      case "FINISH_GAME": {
        cancelGameTimer(gameId);
        const res = await finishGame(gameId);
        if (!res.success) {
          return NextResponse.json(
            { success: false, code: res.code, message: "Could not finish game", requestId },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true, action, message: "Game finished and rankings settled", requestId });
      }

      case "PAUSE_GAME": {
        cancelGameTimer(gameId);
        await prisma.$transaction(async (tx) => {
          await tx.game.update({
            where: { id: gameId },
            data: { status: "PAUSED", version: { increment: 1 } },
          });
          await emitGameEvent(tx, {
            gameId,
            eventType: "GAME_PAUSED",
            payload: { gameId },
          });
        });
        return NextResponse.json({ success: true, action, message: "Game paused", requestId });
      }

      case "RESUME_GAME": {
        await prisma.$transaction(async (tx) => {
          await tx.game.update({
            where: { id: gameId },
            data: { status: "QUESTION_ACTIVE", version: { increment: 1 } },
          });
          await emitGameEvent(tx, {
            gameId,
            eventType: "GAME_RESUMED",
            payload: { gameId },
          });
        });
        await progressGameIfDue(gameId);
        return NextResponse.json({ success: true, action, message: "Game resumed", requestId });
      }

      default:
        return NextResponse.json(
          { success: false, code: "UNKNOWN_ACTION", message: "Unknown action", requestId },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    console.error(`[Admin Game Action Error] ReqID: ${requestId}`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: message || "Failed to execute action",
        requestId,
      },
      { status: 500 }
    );
  }
}
