"use client";

import React, { useState, useEffect } from "react";
import { formatPoints } from "@/lib/utils/format";

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

  // Sync internal string if external numeric prop changes
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
    <div className="space-y-3.5">
      {/* Label and Quick Limit Badges */}
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Betting Amount</span>
          <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
            Min: ₹{formatPoints(minBet)}
          </span>
        </label>
        <span className="font-mono text-[11px] text-zinc-400">
          Max: <span className="font-bold text-white font-mono">₹{formatPoints(maxBet)}</span>
        </span>
      </div>

      {/* Main Controlled Amount Bar: [-] [ Input ] [+] */}
      <div className="flex items-stretch gap-2">
        {/* Minus Button [-] */}
        <button
          type="button"
          disabled={disabled || betAmount <= minBet}
          onClick={() => updateAmount(betAmount - 100)}
          className="w-12 h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-700 active:scale-95 text-lg font-black text-amber-400 transition-all flex items-center justify-center select-none shadow-sm"
          title="Decrease bet by ₹100"
        >
          −
        </button>

        {/* Amount Input with Rupee Symbol */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-black text-lg select-none pointer-events-none">
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
            className={`w-full h-12 pl-8 pr-4 rounded-xl bg-zinc-950 border font-mono font-black text-lg text-white focus:outline-none transition-all ${
              isInvalid
                ? "border-rose-500 focus:ring-2 focus:ring-rose-500/50"
                : "border-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            }`}
            placeholder="1500"
          />
        </div>

        {/* Plus Button [+] */}
        <button
          type="button"
          disabled={disabled || betAmount >= maxBet}
          onClick={() => updateAmount(betAmount + 100)}
          className="w-12 h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-700 active:scale-95 text-lg font-black text-amber-400 transition-all flex items-center justify-center select-none shadow-sm"
          title="Increase bet by ₹100"
        >
          +
        </button>
      </div>

      {/* Quick +/- Delta Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          disabled={disabled || betAmount <= minBet}
          onClick={() => updateAmount(betAmount - 500)}
          className="h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 hover:text-white transition-colors"
        >
          −500
        </button>
        <button
          type="button"
          disabled={disabled || betAmount <= minBet}
          onClick={() => updateAmount(betAmount - 100)}
          className="h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 hover:text-white transition-colors"
        >
          −100
        </button>
        <button
          type="button"
          disabled={disabled || betAmount >= maxBet}
          onClick={() => updateAmount(betAmount + 100)}
          className="h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 hover:text-white transition-colors"
        >
          +100
        </button>
        <button
          type="button"
          disabled={disabled || betAmount >= maxBet}
          onClick={() => updateAmount(betAmount + 500)}
          className="h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 hover:text-white transition-colors"
        >
          +500
        </button>
      </div>

      {/* Quick Percentage Presets: MIN, 25%, 50%, ALL IN */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "MIN (₹500)", val: minBet },
          { label: "25%", val: Math.max(minBet, Math.floor(maxBet * 0.25)) },
          { label: "50%", val: Math.max(minBet, Math.floor(maxBet * 0.5)) },
          { label: "ALL IN", val: maxBet },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            disabled={disabled || maxBet < minBet}
            onClick={() => updateAmount(btn.val)}
            className="h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-700/80 text-[10px] font-mono font-bold text-zinc-200 hover:text-amber-300 transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Validation Feedback */}
      {isBelowMin && (
        <p className="text-[11px] font-bold text-rose-400 font-mono">
          ⚠️ Minimum bet is ₹{formatPoints(minBet)}. Please increase your amount.
        </p>
      )}
      {isAboveMax && (
        <p className="text-[11px] font-bold text-rose-400 font-mono">
          ⚠️ Bet exceeds your current balance of ₹{formatPoints(maxBet)}.
        </p>
      )}
    </div>
  );
};
