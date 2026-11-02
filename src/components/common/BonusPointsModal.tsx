"use client";

import React from "react";
import { formatPoints } from "@/lib/utils/format";
import { Sparkles, ArrowRight } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191820]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-[#EAE7F2] p-6 sm:p-7 text-center shadow-2xl relative">
        {/* Pill indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#6C5CE7]" />
          <span>Game Started • Starting Bankroll</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-[#191820]">
          Welcome to the Game!
        </h3>

        <div className="my-5 py-3.5 px-6 rounded-2xl bg-[#FFF3E8] border border-[#FFD9BE] inline-block">
          <span className="text-2xl sm:text-3xl font-black text-[#FF7417] font-mono tracking-tight">
            +{formatPoints(startingBalance)}
          </span>
          <span className="text-xs font-bold text-[#FF7417] ml-2 uppercase">PTS</span>
        </div>

        <p className="text-xs text-[#6B6A78] mb-6 leading-relaxed">
          Your starting points are deposited. Bet carefully on each question. If you run out of points, you can refill when your balance hits 0.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-5 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.98] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md transition-all inline-flex items-center justify-center gap-2"
        >
          <span>START PLAYING</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
