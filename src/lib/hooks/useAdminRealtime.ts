"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminGameSnapshot } from "../types/game";

/**
 * Clean, on-demand Neon database synchronizer for game administrators.
 * ZERO background polling loops - eliminates all infinite query spam and database load.
 * Host gets fresh state upon initial load, upon host actions, and on-demand via the Refresh button.
 */
export function useAdminRealtime(gameId: string) {
  const [snapshot, setSnapshot] = useState<AdminGameSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const fetchSnapshot = useCallback(async (isManualRefresh = false) => {
    if (!gameId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isManualRefresh) setIsRefreshing(true);

    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Failed to load admin game data");
      const data = await res.json();
      if (data.success && data.data && isMountedRef.current) {
        setSnapshot(data.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err: unknown) {
      console.warn("[Admin Sync Warning]", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, [gameId]);

  // Strictly fetch ONCE on mount when admin enters the page — ZERO setInterval polling!
  useEffect(() => {
    isMountedRef.current = true;
    fetchSnapshot();

    return () => {
      isMountedRef.current = false;
    };
  }, [gameId, fetchSnapshot]);

  const executeAction = async (action: string): Promise<boolean> => {
    setActionLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || `Failed to ${action}`);
        return false;
      }
      // Single fresh pull of updated state from Neon PostgreSQL
      await fetchSnapshot();
      return true;
    } catch {
      setError(`Network error executing ${action}`);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  return {
    snapshot,
    loading,
    isRefreshing,
    lastUpdated,
    error,
    actionLoading,
    executeAction,
    refetch: () => fetchSnapshot(true),
  };
}
