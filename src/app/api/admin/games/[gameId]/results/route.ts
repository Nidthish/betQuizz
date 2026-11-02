import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/session";
import { generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";

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
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        results: {
          orderBy: { finalRank: "asc" },
          include: {
            gamePlayer: {
              select: { displayName: true },
            },
          },
        },
        players: {
          include: {
            submissions: {
              include: {
                question: {
                  select: { questionText: true, correctAnswer: true },
                },
              },
            },
            refills: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { success: false, code: ERROR_CODES.GAME_NOT_FOUND, message: "Game not found", requestId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        code: game.code,
        title: game.title,
        status: game.status,
        results: game.results.map((r: any) => ({
          rank: r.finalRank,
          displayName: r.gamePlayer.displayName,
          finalBalance: r.finalBalance,
          netScore: r.finalScore,
          totalCorrect: r.totalCorrect,
          totalWrong: r.totalWrong,
          totalRefills: r.totalRefills,
          totalFees: r.totalFees,
        })),
        playerDetails: game.players.map((p: any) => ({
          id: p.id,
          name: p.displayName,
          balance: p.balance,
          refillCount: p.refillCount,
          submissions: p.submissions.map((s: any) => ({
            question: s.question.questionText,
            selected: s.selectedAnswer,
            correctAnswer: s.question.correctAnswer,
            isCorrect: s.isCorrect,
            bet: s.betAmount,
            balanceBefore: s.balanceBefore,
            balanceAfter: s.balanceAfter,
            submittedAt: s.submittedAt,
          })),
        })),
      },
      requestId,
    });
  } catch (err) {
    console.error(`[Results Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      { success: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to fetch results", requestId },
      { status: 500 }
    );
  }
}
