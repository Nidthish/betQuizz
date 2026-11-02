"use client";

import React from "react";
import { formatPoints } from "@/lib/utils/format";
import { RefreshCw, AlertCircle } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191820]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-[#EAE7F2] p-6 sm:p-7 text-center shadow-2xl relative">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDEEEC] text-[#EF5350] text-xs font-bold uppercase tracking-wider mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-[#EF5350]" />
          <span>Zero Balance Refill</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-[#191820]">
          Out of Points
        </h3>

        <p className="text-xs text-[#6B6A78] mt-2 mb-5 leading-relaxed">
          Your balance reached <strong className="text-[#EF5350] font-mono">0</strong>. You can take a refill to continue playing the remaining rounds.
        </p>

        <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] text-left space-y-2.5 mb-6 text-xs font-medium">
          <div className="flex justify-between items-center text-[#191820]">
            <span className="text-[#6B6A78]">Refill Amount:</span>
            <span className="font-black font-mono text-[#22B978] text-sm">
              +{formatPoints(refillAmount)} pts
            </span>
          </div>

          <div className="flex justify-between items-center text-[#191820] border-t border-[#EAE7F2] pt-2.5">
            <span className="text-[#6B6A78]">End-Game Penalty:</span>
            <span className="font-black font-mono text-[#EF5350] text-sm">
              -{formatPoints(refillFee)} pts
            </span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={isRefilling}
            className="flex-1 py-3 px-4 rounded-xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmRefill}
            disabled={isRefilling}
            className="flex-1 py-3 px-4 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {isRefilling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Refilling...</span>
              </>
            ) : (
              <span>Take Refill</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
