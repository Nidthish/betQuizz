"use client";

import { useEffect, useState } from "react";

export interface UseAuthoritativeTimerReturn {
  secondsRemaining: number;
  isExpired: boolean;
  percentage: number;
}

/**
 * Computes live countdown from authoritative server timestamps.
 * Recalculates on every tick against the target end date.
 */
export function useAuthoritativeTimer(
  startedAt: string | null,
  endsAt: string | null
): UseAuthoritativeTimerReturn {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(100);

  useEffect(() => {
    if (!endsAt) {
      setSecondsRemaining(0);
      setIsExpired(true);
      setPercentage(0);
      return;
    }

    const startMs = startedAt ? new Date(startedAt).getTime() : Date.now();
    const endMs = new Date(endsAt).getTime();
    const totalDuration = Math.max(1000, endMs - startMs);

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = endMs - now;

      if (remainingMs <= 0) {
        setSecondsRemaining(0);
        setIsExpired(true);
        setPercentage(0);
      } else {
        const secs = Math.ceil(remainingMs / 1000);
        setSecondsRemaining(secs);
        setIsExpired(false);
        const pct = Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100));
        setPercentage(pct);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [startedAt, endsAt]);

  return {
    secondsRemaining,
    isExpired,
    percentage,
  };
}
