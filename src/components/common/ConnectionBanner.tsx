"use client";

import React from "react";

interface ConnectionBannerProps {
  status: "connecting" | "connected" | "reconnecting" | "offline";
  onResync?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ status, onResync }) => {
  // Only alert if device is physically offline
  if (status !== "offline") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full py-1.5 px-4 bg-rose-950 text-rose-200 border-b border-rose-800 text-xs text-center font-medium flex items-center justify-center gap-2"
    >
      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      <span>No internet connection. Waiting for network...</span>
      {onResync && (
        <button
          onClick={onResync}
          className="ml-2 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
        >
          Retry
        </button>
      )}
    </div>
  );
};
