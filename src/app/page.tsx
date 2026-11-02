"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import {
  Gamepad2,
  User,
  AlertCircle,
  ArrowRight,
  Coins,
  BarChart2,
  Calculator,
  RotateCcw,
  Trophy,
  BookOpen,
  Sparkles,
} from "lucide-react";

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

      if (typeof window !== "undefined") {
        localStorage.setItem("quiz_player_name", cleanName);
        if (data.data?.gamePlayerId) {
          localStorage.setItem(`quiz_player_id_${code.trim().toUpperCase()}`, data.data.gamePlayerId);
        }
      }

      router.push(`/game/${code.trim().toUpperCase()}`);
    } catch {
      setError("Network error connecting to game server.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820] relative overflow-hidden">
      <Navbar variant={step === 2 ? "host" : "player"} />

      {/* Decorative background bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none opacity-40 overflow-hidden">
        <svg
          viewBox="0 0 1440 320"
          className="absolute bottom-0 w-full h-full text-[#6C5CE7]"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,192L48,197.3C96,203,192,213,288,202.7C384,192,480,160,576,160C672,160,768,192,864,202.7C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 flex flex-col justify-center relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#E9E5FF] text-[#6C5CE7] text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-3.5 sm:mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-pulse shrink-0" />
            <span className="truncate">REALTIME MULTIPLAYER QUIZ PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#191820] uppercase flex items-center justify-center gap-2.5 sm:gap-3 relative">
            <span>QUIZ</span>
            <span className="text-[#FF7417] relative">
              BETTING
              {/* Curved underline */}
              <svg
                className="absolute -bottom-2 left-0 w-full h-3 text-[#6C5CE7]"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,8 Q50,0 100,8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mt-4 sm:mt-5 text-xs sm:text-base text-[#6B6A78] leading-relaxed max-w-lg mx-auto font-medium px-2">
            Wager points on your trivia knowledge. Start with <strong className="text-[#FF7417] font-bold">10,000 points</strong>, bet on each question, and compete on the live leaderboard.
          </p>
        </div>

        {/* Floating playful decorative elements */}
        <div className="relative max-w-md w-full mx-auto">
          {/* Left trophy illustration decoration */}
          <div className="hidden lg:flex flex-col items-center absolute -left-48 top-6 pointer-events-none select-none">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#FFF3E8] to-[#E9E5FF] border border-[#DDD6FE] p-4 flex items-center justify-center shadow-lg transform -rotate-6">
              <Trophy className="w-16 h-16 text-[#FFB800]" />
            </div>
            <div className="mt-3 flex items-center gap-1 text-[#FFB800] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" />
              <span>LIVE TRIVIA</span>
            </div>
          </div>

          {/* Right books illustration decoration */}
          <div className="hidden lg:flex flex-col items-center absolute -right-48 top-6 pointer-events-none select-none">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#E9E5FF] to-[#FFF3E8] border border-[#DDD6FE] p-4 flex items-center justify-center shadow-lg transform rotate-6">
              <BookOpen className="w-16 h-16 text-[#6C5CE7]" />
            </div>
            <div className="mt-3 px-3 py-1 rounded-full bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold">
              QUIZ ARENA
            </div>
          </div>

          {/* Main Action Card */}
          <div className="bg-white border border-[#EAE7F2] rounded-3xl p-5 sm:p-8 shadow-xl shadow-purple-950/5 relative">
            <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[#EAE7F2] mb-5 sm:mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shadow-sm shrink-0">
                  {step === 1 ? (
                    <Gamepad2 className="w-5 h-5 text-[#6C5CE7]" />
                  ) : (
                    <User className="w-5 h-5 text-[#6C5CE7]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#191820] truncate">
                    {step === 1 ? "Enter Game Code" : "Choose Nickname"}
                  </h2>
                  <p className="text-xs text-[#6B6A78] mt-0.5 truncate">
                    {step === 1 ? (
                      "Get the 6-character code from your host"
                    ) : (
                      <span>
                        Joining room <strong className="text-[#6C5CE7] font-mono">{code}</strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#6C5CE7] hover:underline font-bold transition-all shrink-0 ml-2"
                >
                  Change Code
                </button>
              )}
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF5350] shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {step === 1 ? (
              /* Step 1: Enter Game Code */
              <form onSubmit={handleValidateCode} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#6B6A78] mb-2 uppercase tracking-wider">
                    GAME CODE
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="E.G. ABC123"
                    maxLength={10}
                    autoFocus
                    required
                    className="w-full h-13 sm:h-14 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 font-mono text-center text-xl sm:text-2xl tracking-widest font-black text-[#191820] uppercase placeholder:text-[#A09EB1] outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 sm:h-14 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Step 2: Player Details */
              <form onSubmit={handleJoinGame} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#6B6A78] mb-2 uppercase tracking-wider">
                    YOUR NICKNAME
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={25}
                    autoFocus
                    required
                    className="w-full h-13 sm:h-14 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 text-sm sm:text-base font-bold text-[#191820] placeholder:text-[#A09EB1] outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-14 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>ENTER WAITING ROOM</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Official Platform Rules (Step 2 or visible below) */}
        <div className="mt-8 sm:mt-14 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="h-[1px] bg-[#DDD6FE] flex-1 max-w-[80px] sm:max-w-xs" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#6C5CE7] text-center">
              OFFICIAL PLATFORM RULES
            </h3>
            <div className="h-[1px] bg-[#DDD6FE] flex-1 max-w-[80px] sm:max-w-xs" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            {/* Rule 1: Bankroll */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-black text-[#FF7417] text-xs sm:text-sm font-mono truncate">+10,000</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-[#191820] mt-0.5 truncate">Starting Bankroll</span>
                <span className="block text-[9px] sm:text-[10px] text-[#6B6A78] truncate">Deposited at start</span>
              </div>
            </div>

            {/* Rule 2: Betting Range */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-black text-[#191820] text-xs sm:text-sm font-mono truncate">1 – MAX</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-[#191820] mt-0.5 truncate">Betting Range</span>
                <span className="block text-[9px] sm:text-[10px] text-[#6B6A78] truncate">Up to balance</span>
              </div>
            </div>

            {/* Rule 3: Score Math */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-black text-[#191820] text-xs sm:text-sm font-mono truncate">+/- BET</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-[#191820] mt-0.5 truncate">Score Math</span>
                <span className="block text-[9px] sm:text-[10px] text-[#6B6A78] truncate">Wins & losses</span>
              </div>
            </div>

            {/* Rule 4: Refill Penalty */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-black text-[#FF7417] text-xs sm:text-sm font-mono truncate">-1,000</span>
                <span className="block text-[10px] sm:text-[11px] font-bold text-[#191820] mt-0.5 truncate">Refill Penalty</span>
                <span className="block text-[9px] sm:text-[10px] text-[#6B6A78] truncate">When balance is 0</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
