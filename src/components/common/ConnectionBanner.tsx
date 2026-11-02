"use client";

import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

interface ConnectionBannerProps {
  status: "connecting" | "connected" | "reconnecting" | "offline";
  onResync?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ status, onResync }) => {
  if (status !== "offline") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full py-2 px-3 sm:px-4 bg-[#FDEEEC] text-[#EF5350] border-b border-[#FCA5A5] text-xs text-center font-bold flex items-center justify-center gap-2 animate-fade-in"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">No internet connection. Waiting for network...</span>
      {onResync && (
        <button
          onClick={onResync}
          className="ml-2 px-2.5 py-0.5 rounded-full bg-[#EF5350] hover:bg-[#DC2626] text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1 shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
