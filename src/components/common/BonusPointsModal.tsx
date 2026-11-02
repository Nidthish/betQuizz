"use client";

import React from "react";
import { formatPoints } from "@/lib/utils/format";

interface BonusPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  startingBalance?: number;
}

export const BonusPointsModal: React.FC<BonusPointsModalProps> = ({
  isOpen,
  onClose,
  startingBalance = 10000,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 text-center shadow-2xl relative">
        {/* Pill indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Game Started • Starting Bankroll</span>
        </div>

        <h3 className="text-xl font-black text-white">
          Welcome to the Game!
        </h3>

        <div className="my-4 py-3 px-5 rounded-xl bg-zinc-900 border border-zinc-700/80 inline-block">
          <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">
            +{formatPoints(startingBalance)}
          </span>
          <span className="text-xs font-bold text-zinc-400 ml-1.5 uppercase">PTS</span>
        </div>

        <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
          Your starting points are deposited. Bet carefully on each question. If you run out of points, you can refill when your balance hits 0.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-zinc-950 font-black text-sm tracking-wide shadow-md transition-all"
        >
          START PLAYING
        </button>
      </div>
    </div>
  );
};
