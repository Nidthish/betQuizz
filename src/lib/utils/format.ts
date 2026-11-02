import { GAME_CONSTANTS } from "../constants";

/**
 * Formats points/balances with standard commas (e.g., 10000 -> "10,000")
 */
export function formatPoints(points: number): string {
  if (isNaN(points)) return "0";
  return new Intl.NumberFormat("en-US").format(points);
}

/**
 * Formats a second duration into MM:SS format (e.g. 30 -> "00:30")
 */
export function formatCountdown(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSec / 60);
  const remainingSecs = safeSec % 60;
  return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
}

/**
 * Generates an unguessable, uppercase alphanumeric game code.
 * Uses a safe charset that avoids confusing visual pairs (O/0, I/1).
 */
export function generateGameCode(): string {
  const chars = GAME_CONSTANTS.GAME_CODE_CHARS;
  let code = "";
  for (let i = 0; i < GAME_CONSTANTS.GAME_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  return code;
}

/**
 * Sanitizes user-provided string to prevent HTML/XSS injection when rendered.
 * Trims whitespace and strips dangerous characters.
 */
export function sanitizeText(input: string, maxLength = 50): string {
  if (!input) return "";
  // Strip control characters and trim
  const clean = input
    .replace(/[<>'"&]/g, "")
    .trim()
    .slice(0, maxLength);
  return clean;
}

/**
 * Generates a unique request trace ID for audit logs and error tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
