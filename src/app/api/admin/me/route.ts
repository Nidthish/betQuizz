import { NextResponse } from "next/server";
import { clearAdminSession, getAdminSession } from "@/lib/auth/session";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ success: true, authenticated: true, user: session });
}
