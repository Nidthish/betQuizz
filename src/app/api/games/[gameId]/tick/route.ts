import { NextRequest, NextResponse } from "next/server";
import { progressGameIfDue } from "@/lib/game/game-orchestrator";
import { generateRequestId } from "@/lib/utils/format";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const requestId = generateRequestId();
  const { gameId } = await params;

  try {
    const progressed = await progressGameIfDue(gameId);
    return NextResponse.json({ success: true, progressed, requestId });
  } catch (err) {
    console.warn(`[Tick Error] Game: ${gameId}`, err);
    return NextResponse.json({ success: false, requestId }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  return POST(req, { params });
}
