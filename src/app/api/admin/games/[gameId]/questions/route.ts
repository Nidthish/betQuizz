import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth/session";
import { createQuestionSchema } from "@/lib/validation/schemas";
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
    const parsed = createQuestionSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const detail = issue ? `${issue.message}${issue.path.length > 0 ? ` (at ${issue.path.join(".")})` : ""}` : "Invalid question format";
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: detail,
          requestId,
        },
        { status: 400 }
      );
    }

    const questionsList = parsed.data; // Array of normalized Question items

    // Check game exists and is still in DRAFT or LOBBY
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        gameQuestions: {
          orderBy: { order: "desc" },
          take: 1,
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { success: false, code: ERROR_CODES.GAME_NOT_FOUND, message: "Game not found", requestId },
        { status: 404 }
      );
    }

    if (game.status !== "DRAFT" && game.status !== "LOBBY") {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.INVALID_GAME_STATE,
          message: "Cannot add questions while a game is active or finished.",
          requestId,
        },
        { status: 400 }
      );
    }

    const startingOrder = (game.gameQuestions[0]?.order ?? 0) + 1;

    // Insert questions in high-performance batch
    const createdQuestions = await prisma.question.createManyAndReturn({
      data: questionsList.map((item) => ({
        questionText: item.questionText,
        options: item.options,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        timeLimit: item.timeLimit,
        category: item.category,
      })),
    });

    // Link to GameQuestion in bulk
    await prisma.gameQuestion.createMany({
      data: createdQuestions.map((q: any, idx: number) => ({
        gameId,
        questionId: q.id,
        order: startingOrder + idx,
      })),
    });

    return NextResponse.json({
      success: true,
      count: createdQuestions.length,
      data: createdQuestions,
      requestId,
    });
  } catch (err) {
    console.error(`[Add Question Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      { success: false, code: ERROR_CODES.INTERNAL_ERROR, message: "Failed to add questions", requestId },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { success: false, code: ERROR_CODES.UNAUTHORIZED, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { gameId } = await params;
  const questions = await prisma.gameQuestion.findMany({
    where: { gameId },
    orderBy: { order: "asc" },
    include: { question: true },
  });

  return NextResponse.json({
    success: true,
    data: questions,
  });
}
