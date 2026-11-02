import { z } from "zod";

export const joinGameSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Game code must be at least 4 characters")
    .max(10, "Game code must be at most 10 characters")
    .regex(/^[A-Z0-9]+$/, "Game code must be alphanumeric"),
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(30, "Name cannot exceed 30 characters")
    .regex(/^[\w\s\u00C0-\u017F\u0900-\u097F-]+$/, "Name contains invalid characters"),
});

export const submitQuestionSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  questionId: z.string().min(1, "Question ID is required"),
  selectedAnswer: z.string().trim().min(1, "Answer selection is required"),
  betAmount: z
    .number({ invalid_type_error: "Bet amount must be a number" })
    .int("Bet amount must be a whole integer")
    .min(500, "Minimum bet is ₹500"),
  idempotencyKey: z.string().trim().min(8, "Idempotency key required"),
  clientVersion: z.number().int().optional(),
  gamePlayerId: z.string().optional(),
});

export const refillSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  idempotencyKey: z.string().trim().min(8, "Idempotency key required"),
  gamePlayerId: z.string().optional(),
});

export const createGameSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  startingBalance: z.number().int().min(100, "Starting balance must be at least 100").default(10000),
  refillAmount: z.number().int().min(100, "Refill amount must be at least 100").default(10000),
  refillFee: z.number().int().min(0, "Refill fee cannot be negative").default(1000),
});

export const questionItemSchema = z.object({
  questionText: z.string().trim().min(3, "Question text must be at least 3 characters"),
  options: z.union([
    z.array(z.string().trim().min(1, "Option cannot be empty")),
    z.string().transform((str) => str.split(",").map((s) => s.trim()).filter(Boolean)),
  ]).pipe(
    z.array(z.string().trim().min(1, "Option cannot be empty"))
      .min(2, "At least 2 options are required")
      .max(8, "At most 8 options are allowed")
  ),
  correctAnswer: z.string().trim().min(1, "Correct answer is required"),
  explanation: z.string().trim().optional().nullable(),
  timeLimit: z.union([
    z.number().int(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).pipe(z.number().int().min(3).max(300)).optional(),
  countdownSeconds: z.union([
    z.number().int(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).pipe(z.number().int().min(3).max(300)).optional(),
  category: z.string().trim().optional().nullable(),
}).transform((val) => {
  const effectiveTimeLimit = val.countdownSeconds ?? val.timeLimit ?? 30;
  let resolvedAnswer = val.correctAnswer.trim();

  // Match case-insensitively against options
  const matchingOption = val.options.find(
    (opt) => opt.trim().toLowerCase() === resolvedAnswer.toLowerCase()
  );
  if (matchingOption) {
    resolvedAnswer = matchingOption;
  } else if (/^[A-D]$/i.test(resolvedAnswer)) {
    // If letter format like A, B, C, D
    const idx = resolvedAnswer.toUpperCase().charCodeAt(0) - 65;
    if (val.options[idx]) {
      resolvedAnswer = val.options[idx];
    }
  } else if (/^[1-6]$/.test(resolvedAnswer)) {
    // If numeric format like 1, 2, 3, 4
    const idx = parseInt(resolvedAnswer, 10) - 1;
    if (val.options[idx]) {
      resolvedAnswer = val.options[idx];
    }
  }

  return {
    questionText: val.questionText,
    options: val.options,
    correctAnswer: resolvedAnswer,
    explanation: val.explanation || undefined,
    timeLimit: effectiveTimeLimit,
    category: val.category || undefined,
  };
});

export const createQuestionSchema = z.union([
  // Format: { questions: [ ... ] }
  z.object({
    questions: z.array(questionItemSchema).min(1, "At least one question is required"),
  }).transform((val) => val.questions),
  // Format: [ { ... }, ... ]
  z.array(questionItemSchema).min(1, "At least one question is required"),
  // Format: Single question object { questionText, options, ... }
  questionItemSchema.transform((val) => [val]),
]);

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const gameActionSchema = z.object({
  action: z.enum([
    "OPEN_LOBBY",
    "START_GAME",
    "NEXT_QUESTION",
    "CLOSE_QUESTION",
    "PAUSE_GAME",
    "RESUME_GAME",
    "FINISH_GAME",
    "RESET_GAME",
    "AUTO_TICK",
  ]),
  gameId: z.string().min(1, "Game ID is required"),
  idempotencyKey: z.string().optional(),
});
