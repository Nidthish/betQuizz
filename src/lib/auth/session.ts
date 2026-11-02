import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { GAME_CONSTANTS } from "../constants";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default-secret-key-at-least-32-chars-long!"
);

export interface AdminPayload extends Record<string, unknown> {
  userId: string;
  email: string;
  role: "ADMIN";
}

export interface PlayerPayload extends Record<string, unknown> {
  guestId: string;
  displayName: string;
  // Map of gameId -> gamePlayerId for fast local lookup
  gameParticipations?: Record<string, string>;
}

/**
 * Creates a signed JWT token
 */
export async function signToken<T extends Record<string, unknown>>(
  payload: T,
  expiresIn: string = "7d"
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

/**
 * Verifies and decodes a signed JWT token
 */
export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as T;
  } catch {
    return null;
  }
}

/**
 * Gets the current admin session from HTTP-only cookie
 */
export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GAME_CONSTANTS.COOKIES.ADMIN_SESSION)?.value;
  if (!token) return null;
  return await verifyToken<AdminPayload>(token);
}

/**
 * Sets the admin session in an HTTP-only cookie
 */
export async function setAdminSession(admin: AdminPayload): Promise<void> {
  const token = await signToken(admin, "7d");
  const cookieStore = await cookies();
  cookieStore.set(GAME_CONSTANTS.COOKIES.ADMIN_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clears the admin session cookie
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GAME_CONSTANTS.COOKIES.ADMIN_SESSION);
}

/**
 * Gets current player session from HTTP-only cookie
 */
export async function getPlayerSession(): Promise<PlayerPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GAME_CONSTANTS.COOKIES.PLAYER_SESSION)?.value;
  if (!token) return null;
  return await verifyToken<PlayerPayload>(token);
}

/**
 * Sets or updates the player session cookie
 */
export async function setPlayerSession(player: PlayerPayload): Promise<void> {
  const token = await signToken(player, "30d");
  const cookieStore = await cookies();
  cookieStore.set(GAME_CONSTANTS.COOKIES.PLAYER_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}
