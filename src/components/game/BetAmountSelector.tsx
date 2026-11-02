"use client";

import React, { useState, useEffect } from "react";
import { formatPoints } from "@/lib/utils/format";
import { Coins, Minus, Plus, AlertCircle } from "lucide-react";

interface BetAmountSelectorProps {
  balance: number;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  disabled?: boolean;
  minBet?: number;
}

export const BetAmountSelector: React.FC<BetAmountSelectorProps> = ({
  balance,
  betAmount,
  onBetAmountChange,
  disabled = false,
  minBet = 500,
}) => {
  const [inputValue, setInputValue] = useState<string>(String(betAmount));
  const maxBet = Math.max(0, balance);

  useEffect(() => {
    setInputValue(String(betAmount));
  }, [betAmount]);

  const updateAmount = (newVal: number) => {
    if (disabled) return;
    const clamped = Math.max(minBet, Math.min(newVal, maxBet));
    onBetAmountChange(clamped);
    setInputValue(String(clamped));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onBetAmountChange(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < minBet) {
      updateAmount(minBet);
    } else if (parsed > maxBet) {
      updateAmount(maxBet);
    } else {
      updateAmount(parsed);
    }
  };

  const isBelowMin = betAmount < minBet;
  const isAboveMax = betAmount > maxBet;
  const isInvalid = isBelowMin || isAboveMax || isNaN(betAmount);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Header with Title, Min badge, and Max label */}
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Stacked Coins Icon */}
          <div className="w-6 h-6 rounded-lg bg-[#E9E5FF] text-[#6C5CE7] flex items-center justify-center shrink-0">
            <Coins className="w-3.5 h-3.5 text-[#6C5CE7]" />
          </div>
          <span className="font-extrabold text-[#191820] text-xs sm:text-sm tracking-tight truncate">Betting Amount</span>
          <span className="text-[10px] sm:text-[11px] text-[#FF7417] font-bold bg-[#FFF3E8] border border-[#FFD9BE] px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">
            Min: ₹{formatPoints(minBet)}
          </span>
        </div>
        <span className="text-xs text-[#6B6A78] shrink-0 whitespace-nowrap">
          Max: <strong className="text-[#191820] font-black font-mono">₹{formatPoints(maxBet)}</strong>
        </span>
      </div>

      {/* Main Stepper Bar: [-] [ ₹ Input ] [+] */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Minus Button [-] */}
        <button
          type="button"
          disabled={disabled || betAmount <= minBet}
          onClick={() => updateAmount(betAmount - 100)}
          className="w-12 sm:w-14 h-12 rounded-2xl bg-[#F4F1FF] hover:bg-[#E9E5FF] disabled:opacity-40 border border-[#DDD6FE] active:scale-95 text-[#6C5CE7] transition-all flex items-center justify-center select-none shadow-sm shrink-0"
          title="Decrease bet by ₹100"
          aria-label="Decrease bet by ₹100"
        >
          <Minus className="w-5 h-5 text-[#6C5CE7]" />
        </button>

        {/* Amount Input with Rupee Symbol */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-[#FF7417] font-black text-lg sm:text-xl select-none pointer-events-none">
            ₹
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={`w-full h-12 pl-8 sm:pl-9 pr-3 sm:pr-4 rounded-2xl bg-white border font-mono font-black text-lg sm:text-xl text-[#191820] focus:outline-none transition-all ${
              isInvalid
                ? "border-[#EF5350] focus:ring-2 focus:ring-[#EF5350]/30"
                : "border-[#DDD6FE] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
            }`}
            placeholder="500"
          />
        </div>

        {/* Plus Button [+] */}
        <button
          type="button"
          disabled={disabled || betAmount >= maxBet}
          onClick={() => updateAmount(betAmount + 100)}
          className="w-12 sm:w-14 h-12 rounded-2xl bg-[#F4F1FF] hover:bg-[#E9E5FF] disabled:opacity-40 border border-[#DDD6FE] active:scale-95 text-[#6C5CE7] transition-all flex items-center justify-center select-none shadow-sm shrink-0"
          title="Increase bet by ₹100"
          aria-label="Increase bet by ₹100"
        >
          <Plus className="w-5 h-5 text-[#6C5CE7]" />
        </button>
      </div>

      {/* Quick +/- Delta Buttons */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {[-500, -100, 100, 500].map((delta) => {
          const isPos = delta > 0;
          return (
            <button
              key={delta}
              type="button"
              disabled={
                disabled ||
                (delta < 0 && betAmount <= minBet) ||
                (delta > 0 && betAmount >= maxBet)
              }
              onClick={() => updateAmount(betAmount + delta)}
              className="h-9 sm:h-10 rounded-xl bg-[#F7F6F2] hover:bg-[#E9E5FF] disabled:opacity-40 border border-[#EAE7F2] hover:border-[#DDD6FE] text-[10px] sm:text-xs font-mono font-bold text-[#6C5CE7] transition-all active:scale-95 whitespace-nowrap"
            >
              {isPos ? `+${delta}` : delta}
            </button>
          );
        })}
      </div>

      {/* Quick Percentage Presets: MIN, 25%, 50%, ALL IN */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {[
          { label: "MIN", val: minBet },
          { label: "25%", val: Math.max(minBet, Math.floor(maxBet * 0.25)) },
          { label: "50%", val: Math.max(minBet, Math.floor(maxBet * 0.5)) },
          { label: "ALL IN", val: maxBet },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            disabled={disabled || maxBet < minBet}
            onClick={() => updateAmount(btn.val)}
            className="h-9 sm:h-10 rounded-xl bg-[#F7F6F2] hover:bg-[#E9E5FF] disabled:opacity-40 border border-[#EAE7F2] hover:border-[#DDD6FE] text-[11px] sm:text-xs font-bold text-[#6C5CE7] transition-all active:scale-95 px-1 sm:px-2 truncate"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Validation Feedback */}
      {isBelowMin && (
        <p className="text-[11px] font-bold text-[#EF5350] font-mono flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Minimum bet is ₹{formatPoints(minBet)}. Please increase your amount.</span>
        </p>
      )}
      {isAboveMax && (
        <p className="text-[11px] font-bold text-[#EF5350] font-mono flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Bet exceeds your current balance of ₹{formatPoints(maxBet)}.</span>
        </p>
      )}
    </div>
  );
};
