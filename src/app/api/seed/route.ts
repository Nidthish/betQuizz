import { NextResponse } from "next/server";
import { main } from "@/../prisma/seed";

export async function POST() {
  try {
    await main();
    return NextResponse.json({ success: true, message: "Database seeded successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
