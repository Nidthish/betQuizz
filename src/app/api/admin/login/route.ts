import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminLoginSchema } from "@/lib/validation/schemas";
import { setAdminSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { compare } from "bcryptjs";
import { generateRequestId } from "@/lib/utils/format";
import { ERROR_CODES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Rate limit admin login attempts
  const rateLimit = await checkRateLimit(`admin_login:${ip}`, 5, 60000);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: "Too many login attempts. Please wait a minute.",
        requestId,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid login credentials",
          requestId,
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Default development fallback check or database lookup
    const defaultAdminEmail = process.env.ADMIN_DEFAULT_EMAIL || "admin@quizbetting.com";
    const defaultAdminPass = process.env.ADMIN_DEFAULT_PASSWORD || "AdminPassword123!";

    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    let isValid = false;

    if (user && user.passwordHash) {
      isValid = await compare(password, user.passwordHash);
    } else if (email.toLowerCase() === defaultAdminEmail.toLowerCase() && password === defaultAdminPass) {
      // Create admin user in DB if it doesn't exist yet
      user = await prisma.user.upsert({
        where: { email: defaultAdminEmail.toLowerCase() },
        create: {
          name: "Game Administrator",
          email: defaultAdminEmail.toLowerCase(),
          role: "ADMIN",
        },
        update: {
          role: "ADMIN",
        },
      });
      isValid = true;
    }

    if (!isValid || !user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Invalid email or password.",
          requestId,
        },
        { status: 401 }
      );
    }

    // Set secure HTTP-only session cookie
    await setAdminSession({
      userId: user.id,
      email: user.email,
      role: "ADMIN",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      requestId,
    });
  } catch (err) {
    console.error(`[Admin Login Error] ReqID: ${requestId}`, err);
    return NextResponse.json(
      {
        success: false,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Login failed.",
        requestId,
      },
      { status: 500 }
    );
  }
}
