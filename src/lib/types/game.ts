export type GameStatus =
  | "DRAFT"
  | "LOBBY"
  | "QUESTION_ACTIVE"
  | "QUESTION_CLOSED"
  | "FINAL_ROUND"
  | "FINISHED"
  | "PAUSED"
  | "CANCELLED";

export type PlayerStatus =
  | "JOINED"
  | "WAITING"
  | "ACTIVE"
  | "DISCONNECTED"
  | "RECONNECTED"
  | "FINISHED"
  | "REMOVED";

export type SubmissionStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type BetOutcome = "WON" | "LOST" | "CANCELLED";

export type UserRole = "ADMIN" | "PLAYER";

export interface QuestionOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface SanitizedQuestion {
  id: string;
  questionText: string;
  options: string[] | QuestionOption[];
  timeLimit: number;
  order: number;
  category?: string | null;
  // Note: correctAnswer is NOT present while question is active!
  correctAnswer?: string;
  explanation?: string | null;
}

export interface PlayerPublicState {
  id: string;
  displayName: string;
  avatarId?: string;
  balance: number;
  status: PlayerStatus;
  refillCount: number;
  totalRefillFees: number;
  hasSubmittedCurrentQuestion?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  gamePlayerId: string;
  displayName: string;
  avatarId?: string;
  balance: number;
  totalCorrect: number;
  totalWrong: number;
  refillCount: number;
  refillFees: number;
  netScore: number; // balance - refillFees
  isCurrentPlayer?: boolean;
}

export interface JoinedPlayerSummary {
  id: string;
  displayName: string;
  avatarId?: string;
}

export interface AuthoritativeGameSnapshot {
  gameId: string;
  gameCode: string;
  title: string;
  status: GameStatus;
  version: number;
  sequenceNumber: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: SanitizedQuestion | null;
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  serverTime: string;
  player: {
    id: string;
    displayName: string;
    avatarId?: string;
    balance: number;
    status: PlayerStatus;
    refillCount: number;
    totalRefillFees: number;
    submittedCurrentQuestion: boolean;
    lastSubmission?: {
      selectedAnswer: string;
      betAmount: number;
      isCorrect?: boolean;
      balanceAfter?: number;
    } | null;
    totalWins?: number;
    totalLosses?: number;
    totalWagered?: number;
    netResult?: number;
    isCompleted?: boolean;
  } | null;
  leaderboard: LeaderboardEntry[];
  joinedPlayers?: JoinedPlayerSummary[];
  totalPlayers: number;
  isCompleted?: boolean;
  rules: {
    startingBalance: number;
    refillAmount: number;
    refillFee: number;
    minBet?: number;
  };
}

export interface AdminQuestionItem {
  id: string;
  gameQuestionId?: string;
  order: number;
  questionText: string;
  options: string[];
  timeLimit: number;
  correctAnswer: string;
  explanation?: string | null;
}

export interface AdminGameSnapshot {
  gameId: string;
  gameCode: string;
  title: string;
  status: GameStatus;
  version: number;
  sequenceNumber: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: (SanitizedQuestion & { correctAnswer: string; explanation?: string | null }) | null;
  questions?: AdminQuestionItem[];
  questionStartedAt: string | null;
  questionEndsAt: string | null;
  serverTime: string;
  totalPlayers: number;
  activePlayers: number;
  submissionCount: number;
  unsubmittedCount: number;
  leaderboard: LeaderboardEntry[];
  rules: {
    startingBalance: number;
    refillAmount: number;
    refillFee: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
  requestId?: string;
}
