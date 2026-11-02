"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AuthoritativeGameSnapshot } from "../types/game";
import { nanoid } from "nanoid";

export interface UseGameRealtimeReturn {
  snapshot: AuthoritativeGameSnapshot | null;
  connectionStatus: "connecting" | "connected" | "reconnecting" | "offline";
  isSubmitting: boolean;
  isRefilling: boolean;
  error: string | null;
  submitBet: (selectedAnswer: string, betAmount: number) => Promise<boolean>;
  requestRefill: () => Promise<boolean>;
  resync: () => Promise<void>;
}

/**
 * Ultra-lean, low-load database snapshot synchronizer.
 * Fetches authoritative game state directly from Neon PostgreSQL without WebSockets.
 * Eliminates aggressive polling loops and stops polling completely when games finish.
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

  // Initial load and adaptive gentle cadence
  useEffect(() => {
    isMountedRef.current = true;
    fetchSnapshot();

    // If game is FINISHED, stop polling completely
    if (snapshot?.status === "FINISHED") {
      return () => {
        isMountedRef.current = false;
      };
    }

    // Adaptive intervals for snappy transitions while protecting Neon DB
    let intervalMs: number = 3000;

    if (snapshot?.status === "QUESTION_ACTIVE" || snapshot?.status === "FINAL_ROUND") {
      intervalMs = 2000;
    } else if (snapshot?.status === "QUESTION_CLOSED") {
      intervalMs = 1000;
    } else if (snapshot?.status === "LOBBY" || snapshot?.status === "DRAFT") {
      intervalMs = 3000;
    }

    const interval = setInterval(() => {
      // Pause poll entirely when browser tab is inactive to save Neon DB compute
      if (document.visibilityState === "visible") {
        fetchSnapshot();
      }
    }, intervalMs);

    // Refresh when tab gains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSnapshot();
      }
    };

    const handleOnline = () => {
      setConnectionStatus("connected");
      fetchSnapshot();
    };

    const handleOffline = () => {
      setConnectionStatus("offline");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [gameId, fetchSnapshot, snapshot?.status]);

  // Submit Answer + Bet atomically
  const submitBet = async (selectedAnswer: string, betAmount: number): Promise<boolean> => {
    if (!snapshot?.currentQuestion) return false;

    setIsSubmitting(true);
    setError(null);
    const idempotencyKey = `sub_${gameId}_${snapshot.currentQuestion.id}_${nanoid(12)}`;

    try {
      const res = await fetch(`/api/games/${gameId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: snapshot.currentQuestion.id,
          selectedAnswer,
          betAmount,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to submit answer");
        return false;
      }

      // Immediately pull fresh state to confirm submission
      await fetchSnapshot();
      return true;
    } catch {
      setError("Network timeout submitting answer. Please verify connection.");
      return false;
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
        body: JSON.stringify({ idempotencyKey }),
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
  };
}
