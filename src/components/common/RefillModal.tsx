"use client";

import React from "react";
import { formatPoints } from "@/lib/utils/format";

interface RefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRefill: () => Promise<boolean>;
  isRefilling: boolean;
  refillAmount?: number;
  refillFee?: number;
}

export const RefillModal: React.FC<RefillModalProps> = ({
  isOpen,
  onClose,
  onConfirmRefill,
  isRefilling,
  refillAmount = 10000,
  refillFee = 1000,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 text-center shadow-2xl relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Zero Balance Refill</span>
        </div>

        <h3 className="text-xl font-black text-white">
          Out of Points
        </h3>

        <p className="text-xs text-zinc-300 mt-2 mb-4 leading-relaxed">
          Your balance reached <strong className="text-rose-400 font-mono">0</strong>. You can take a refill to continue playing the remaining rounds.
        </p>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-left space-y-2 mb-5 text-xs font-medium">
          <div className="flex justify-between items-center text-zinc-300">
            <span>Refill Amount:</span>
            <span className="font-bold font-mono text-emerald-400">
              +{formatPoints(refillAmount)} pts
            </span>
          </div>

          <div className="flex justify-between items-center text-zinc-300 border-t border-zinc-800 pt-2">
            <span className="text-zinc-400">End-Game Penalty:</span>
            <span className="font-bold font-mono text-rose-400">
              -{formatPoints(refillFee)} pts
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isRefilling}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmRefill}
            disabled={isRefilling}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black text-xs transition-all flex items-center justify-center gap-1.5"
          >
            {isRefilling ? (
              <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Confirm Refill</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
