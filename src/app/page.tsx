"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setError("Please enter a valid game code (at least 4 characters).");
      return;
    }
    setCode(cleanCode);
    setStep(2);
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = displayName.trim();
    if (!cleanName || cleanName.length < 2) {
      setError("Please enter a nickname with at least 2 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          displayName: cleanName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Game not found or closed.");
        setLoading(false);
        return;
      }

      router.push(`/game/${code.trim().toUpperCase()}`);
    } catch {
      setError("Network error connecting to game server.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-amber-400 selection:text-zinc-950">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Realtime Multiplayer Quiz Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Quiz <span className="text-amber-400">Betting</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg mx-auto">
            Wager points on your trivia knowledge. Start with <strong className="text-white">10,000 points</strong>, bet on each question, and compete on the live leaderboard.
          </p>
        </div>

        {/* Player Join Card */}
        <div className="max-w-md w-full mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
            <div>
              <h2 className="text-base font-bold text-white">
                {step === 1 ? "Enter Game Code" : "Choose Nickname"}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {step === 1 ? "Get the 6-character code from your host" : `Joining room ${code}`}
              </p>
            </div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
              >
                Change Code
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            /* Step 1: Enter Game Code */
            <form onSubmit={handleValidateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Game Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  maxLength={10}
                  autoFocus
                  required
                  className="w-full h-14 px-4 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono text-center text-2xl tracking-widest font-black text-amber-400 uppercase placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-zinc-950 font-black text-sm uppercase tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <span className="font-bold">→</span>
              </button>
            </form>
          ) : (
            /* Step 2: Player Details */
            <form onSubmit={handleJoinGame} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Your Nickname
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={25}
                  autoFocus
                  required
                  className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-base font-semibold text-white placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-50 text-zinc-950 font-black text-sm uppercase tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Enter Waiting Room →</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Clean Rules Grid */}
        <div className="mt-10 sm:mt-12 max-w-2xl mx-auto w-full">
          <div className="text-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Official Platform Rules
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="block font-black text-amber-400 text-sm font-mono">+10,000</span>
              <span className="block text-[11px] font-bold text-zinc-200 mt-0.5">Starting Bankroll</span>
              <span className="block text-[10px] text-zinc-400 mt-0.5">Deposited at game start</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="block font-black text-zinc-100 text-sm font-mono">1 – MAX</span>
              <span className="block text-[11px] font-bold text-zinc-200 mt-0.5">Betting Range</span>
              <span className="block text-[10px] text-zinc-400 mt-0.5">Up to your balance</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="block font-black text-emerald-400 text-sm font-mono">+/- BET</span>
              <span className="block text-[11px] font-bold text-zinc-200 mt-0.5">Score Math</span>
              <span className="block text-[10px] text-zinc-400 mt-0.5">Correct wins, wrong loses</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="block font-black text-rose-400 text-sm font-mono">-1,000</span>
              <span className="block text-[11px] font-bold text-zinc-200 mt-0.5">Refill Penalty</span>
              <span className="block text-[10px] text-zinc-400 mt-0.5">Only when balance hits 0</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-500">
        <p>Quiz Betting Platform • High-Concurrency PostgreSQL Engine</p>
      </footer>
    </div>
  );
}
