export const GAME_CONSTANTS = {
  // Default points given to players upon game start (Login Bonus)
  DEFAULT_STARTING_BALANCE: 10000,
  
  // Default refill points when balance hits 0
  DEFAULT_REFILL_AMOUNT: 10000,
  
  // Default penalty fee deducted at game end per refill
  DEFAULT_REFILL_FEE: 1000,
  
  // Default question countdown limit in seconds
  DEFAULT_QUESTION_TIME_LIMIT: 30,
  
  // Network latency grace period for server timer acceptance (milliseconds)
  SUBMISSION_GRACE_PERIOD_MS: 500,
  
  // Maximum game code length and charset
  GAME_CODE_LENGTH: 6,
  GAME_CODE_CHARS: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", // Excludes easily confused chars like 0, O, 1, I
  
  // Rate limiting defaults
  RATE_LIMIT: {
    JOIN_ATTEMPTS: { max: 10, windowMs: 60 * 1000 },
    SUBMISSION_ATTEMPTS: { max: 60, windowMs: 60 * 1000 },
    REFILL_ATTEMPTS: { max: 5, windowMs: 60 * 1000 },
    ADMIN_LOGIN_ATTEMPTS: { max: 5, windowMs: 60 * 1000 },
  },

  // Auth cookie keys
  COOKIES: {
    ADMIN_SESSION: "qz_admin_session",
    PLAYER_SESSION: "qz_player_session",
  },
} as const;

export const ERROR_CODES = {
  // Game errors
  GAME_NOT_FOUND: "GAME_NOT_FOUND",
  GAME_NOT_JOINABLE: "GAME_NOT_JOINABLE",
  GAME_NOT_STARTABLE: "GAME_NOT_STARTABLE",
  GAME_ALREADY_STARTED: "GAME_ALREADY_STARTED",
  GAME_PAUSED: "GAME_PAUSED",
  GAME_FINISHED: "GAME_FINISHED",
  INVALID_GAME_STATE: "INVALID_GAME_STATE",
  NO_QUESTIONS_CONFIGURED: "NO_QUESTIONS_CONFIGURED",
  
  // Question & Submission errors
  QUESTION_NOT_ACTIVE: "QUESTION_NOT_ACTIVE",
  QUESTION_EXPIRED: "QUESTION_EXPIRED",
  ALREADY_SUBMITTED: "ALREADY_SUBMITTED",
  INVALID_ANSWER: "INVALID_ANSWER",
  INVALID_BET_AMOUNT: "INVALID_BET_AMOUNT",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  
  // Refill errors
  REFILL_NOT_ALLOWED: "REFILL_NOT_ALLOWED", // Balance must be exactly 0
  CONCURRENT_REFILL: "CONCURRENT_REFILL",
  
  // Player & Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  PLAYER_NAME_REQUIRED: "PLAYER_NAME_REQUIRED",
  PLAYER_LIMIT_REACHED: "PLAYER_LIMIT_REACHED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // System errors
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  IDEMPOTENT_RETRY: "IDEMPOTENT_RETRY",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
