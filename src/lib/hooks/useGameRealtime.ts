"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AuthoritativeGameSnapshot } from "../types/game";
import { SubmitResponseOutput } from "../game/bet-engine";
import { nanoid } from "nanoid";

export interface UseGameRealtimeReturn {
  snapshot: AuthoritativeGameSnapshot | null;
  connectionStatus: "connecting" | "connected" | "reconnecting" | "offline";
  isSubmitting: boolean;
  isRefilling: boolean;
  error: string | null;
  submitBet: (
    questionId: string,
    selectedAnswer: string,
    betAmount: number
  ) => Promise<SubmitResponseOutput | null>;
  requestRefill: () => Promise<boolean>;
  resync: () => Promise<void>;
  setSnapshot: React.Dispatch<React.SetStateAction<AuthoritativeGameSnapshot | null>>;
}

/**
 * Authoritative Neon PostgreSQL database synchronizer for players.
 * Continuously detects game status changes (e.g. host starting the game, next round, pause, reset).
 * Ensures instant transition from lobby to active round as soon as the host begins.
 */
export function useGameRealtime(
  gameId: string,
  playerId?: string | null
): UseGameRealtimeReturn {
  const [snapshot, setSnapshot] = useState<AuthoritativeGameSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "offline"
  >("connecting");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  // Authoritative snapshot fetcher from Neon PostgreSQL
  const fetchSnapshot = useCallback(async () => {
    if (!gameId || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const url = new URL(`/api/games/${gameId}/snapshot`, window.location.origin);
      if (playerId) url.searchParams.set("playerId", playerId);

      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) throw new Error("Failed to load game snapshot");

      const data = await res.json();
      if (data.success && data.data && isMountedRef.current) {
        setSnapshot(data.data);
        setConnectionStatus("connected");
        setError(null);
      }
    } catch {
      if (isMountedRef.current) {
        setConnectionStatus(navigator.onLine ? "connected" : "offline");
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [gameId, playerId]);

  // Initial fetch and automatic state transition sync
  useEffect(() => {
    isMountedRef.current = true;
    fetchSnapshot();

    // Fast sync in Lobby, Intermission, or Paused (1.2s) so transitions feel instant
    // Steady sync during active questions (3.5s) to detect admin actions
    const currentStatus = snapshot?.status;
    const isTransitionState =
      !currentStatus ||
      currentStatus === "LOBBY" ||
      currentStatus === "DRAFT" ||
      currentStatus === "QUESTION_CLOSED" ||
      currentStatus === "PAUSED";

    const pollInterval = isTransitionState
      ? 1200
      : currentStatus === "FINISHED"
      ? 8000
      : 3500;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchSnapshot();
      }
    }, pollInterval);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [gameId, fetchSnapshot, snapshot?.status]);

  // Submit Answer + Bet atomically in one request
  const submitBet = async (
    questionId: string,
    selectedAnswer: string,
    betAmount: number
  ): Promise<SubmitResponseOutput | null> => {
    setIsSubmitting(true);
    setError(null);
    const idempotencyKey = `bet_${gameId}_${playerId || "p"}_${questionId}_${Date.now()}_${nanoid(8)}`;

    try {
      const res = await fetch(`/api/games/${gameId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gamePlayerId: playerId,
          questionId,
          selectedAnswer,
          betAmount,
          idempotencyKey,
          clientVersion: snapshot?.version,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.message || "Failed to submit bet";
        setError(errorMsg);
        return {
          success: false,
          code: data.code,
          message: errorMsg,
        };
      }

      const payload: SubmitResponseOutput = data.data || data;

      // Update local state directly from authoritative response without an extra network request
      if (isMountedRef.current && snapshot) {
        setSnapshot((prev) => {
          if (!prev) return prev;
          const newBal = payload.balance ?? payload.balanceAfter ?? prev.player?.balance ?? 0;
          return {
            ...prev,
            player: prev.player
              ? {
                  ...prev.player,
                  balance: newBal,
                  totalWins: (prev.player.totalWins ?? 0) + (payload.isCorrect ? 1 : 0),
                  totalLosses: (prev.player.totalLosses ?? 0) + (payload.isCorrect ? 0 : 1),
                  totalWagered: (prev.player.totalWagered ?? 0) + (payload.betAmount ?? 0),
                  netResult: newBal - prev.rules.startingBalance,
                  isCompleted: payload.game?.completed ?? false,
                  lastSubmission: {
                    selectedAnswer,
                    betAmount: payload.betAmount ?? betAmount,
                    isCorrect: payload.isCorrect,
                    balanceAfter: newBal,
                  },
                }
              : null,
            isCompleted: payload.game?.completed ?? false,
          };
        });
      }

      return payload;
    } catch {
      const netError = "Network error submitting bet. Please check your connection.";
      setError(netError);
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: netError,
      };
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  // Request Emergency Refill atomically
  const requestRefill = async (): Promise<boolean> => {
    setIsRefilling(true);
    setError(null);
    const idempotencyKey = `refill_${gameId}_${playerId || "p"}_${Date.now()}`;

    try {
      const res = await fetch(`/api/games/${gameId}/refill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gamePlayerId: playerId,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Refill not available (balance must be 0).");
        return false;
      }

      await fetchSnapshot();
      return true;
    } catch {
      setError("Network error requesting refill.");
      return false;
    } finally {
      if (isMountedRef.current) setIsRefilling(false);
    }
  };

  return {
    snapshot,
    connectionStatus,
    isSubmitting,
    isRefilling,
    error,
    submitBet,
    requestRefill,
    resync: fetchSnapshot,
    setSnapshot,
  };
}
