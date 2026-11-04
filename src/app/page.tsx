"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import { MASCOTS, Mascot, getMascot } from "@/lib/constants/mascots";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import {
  Gamepad2,
  User,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Coins,
  BarChart2,
  Calculator,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Check,
  Smile,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMascot: Mascot | null = selectedAvatarId ? getMascot(selectedAvatarId) : null;

  // Step 1: Validate Game Code
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

  // Step 2: Validate Nickname & Move to Character Select
  const handleValidateName = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = displayName.trim();
    if (!cleanName || cleanName.length < 2) {
      setError("Please enter a nickname with at least 2 characters.");
      return;
    }
    setStep(3);
  };

  // Step 3: Confirm Mascot and Join Room
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = displayName.trim();

    if (!cleanName || cleanName.length < 2) {
      setError("Please enter a nickname with at least 2 characters.");
      setStep(2);
      return;
    }

    if (!selectedAvatarId) {
      setError("Please select a mascot below before joining.");
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
          avatarId: selectedAvatarId,
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
        localStorage.setItem("quiz_player_avatar", selectedAvatarId);
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
      <Navbar variant={step === 3 ? "host" : "player"} />

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

      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8 flex flex-col justify-center relative z-10">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
              step === 1 ? "bg-[#6C5CE7] text-white shadow-sm" : "bg-[#E9E5FF] text-[#6C5CE7]"
            }`}
          >
            <span>1</span>
            <span className="hidden sm:inline">Room Code</span>
          </div>
          <span className="text-[#DDD6FE] font-black">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
              step === 2 ? "bg-[#6C5CE7] text-white shadow-sm" : "bg-[#E9E5FF] text-[#6C5CE7]"
            }`}
          >
            <span>2</span>
            <span className="hidden sm:inline">Nickname</span>
          </div>
          <span className="text-[#DDD6FE] font-black">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
              step === 3 ? "bg-[#6C5CE7] text-white shadow-sm" : "bg-[#E9E5FF] text-[#6C5CE7]"
            }`}
          >
            <span>3</span>
            <span className="hidden sm:inline">Mascot</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="max-w-md w-full mx-auto mb-4 p-3.5 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 text-[#EF5350] shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* STEP 1: ENTER ROOM CODE */}
        {step === 1 && (
          <div className="max-w-md w-full mx-auto animate-fade-in">
            {/* Hero text */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E9E5FF] text-[#6C5CE7] text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-pulse shrink-0" />
                <span>REALTIME MULTIPLAYER QUIZ</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#191820] uppercase flex items-center justify-center gap-2">
                <span>QUIZ</span>
                <span className="text-[#FF7417]">BETTING</span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#6B6A78] font-medium">
                Enter your host&apos;s game code to enter the arena.
              </p>
            </div>

            <div className="bg-white border border-[#EAE7F2] rounded-3xl p-6 sm:p-7 shadow-xl shadow-purple-950/5">
              <div className="flex items-center gap-3 pb-4 border-b border-[#EAE7F2] mb-5">
                <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shadow-sm shrink-0">
                  <Gamepad2 className="w-5 h-5 text-[#6C5CE7]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#191820]">Enter Game Code</h2>
                  <p className="text-xs text-[#6B6A78]">Get the 4–10 character code from your host</p>
                </div>
              </div>

              <form onSubmit={handleValidateCode} className="space-y-4">
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
                    className="w-full h-[52px] sm:h-[56px] px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 font-mono text-center text-2xl tracking-widest font-black text-[#191820] uppercase placeholder:text-[#A09EB1] outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-[52px] sm:h-[56px] rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: ENTER NICKNAME */}
        {step === 2 && (
          <div className="max-w-md w-full mx-auto animate-fade-in">
            <div className="bg-white border border-[#EAE7F2] rounded-3xl p-6 sm:p-7 shadow-xl shadow-purple-950/5">
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE7F2] mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shadow-sm shrink-0">
                    <User className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-[#191820]">Your Nickname</h2>
                    <p className="text-xs text-[#6B6A78]">
                      Joining room <strong className="text-[#6C5CE7] font-mono">{code}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs text-[#6C5CE7] hover:underline font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>

              <form onSubmit={handleValidateName} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-[#6B6A78] mb-2 uppercase tracking-wider flex items-center justify-between">
                    <span>ENTER YOUR NICKNAME</span>
                    <span className="text-[11px] font-normal text-[#A09EB1] font-mono">
                      {displayName.trim().length}/25
                    </span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="E.g. SpeedRacer, QuizMaster"
                    maxLength={25}
                    autoFocus
                    required
                    className="w-full h-[52px] sm:h-[56px] px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 text-base font-bold text-[#191820] placeholder:text-[#A09EB1] outline-none transition-all"
                  />
                  <p className="text-[11px] text-[#A09EB1] mt-2 font-medium">
                    This is how other students and the host will see you on the live scoreboard.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={displayName.trim().length < 2}
                  className="w-full h-[52px] sm:h-[56px] rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>CHOOSE YOUR MASCOT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 3: DEDICATED CHARACTER SELECTION PAGE (Responsive Desktop 2-Col & Mobile Stack) */}
        {step === 3 && (
          <div className="max-w-4xl w-full mx-auto animate-fade-in">
            <div className="bg-white border border-[#EAE7F2] rounded-3xl p-4 sm:p-6 shadow-xl shadow-purple-950/5 flex flex-col">
              {/* Header Navigation Bar */}
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#EAE7F2] mb-3 sm:mb-5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] text-xs font-bold hover:bg-[#E9E5FF] transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="text-center min-w-0 px-2">
                  <h2 className="text-sm sm:text-lg font-black text-[#191820] uppercase tracking-tight truncate">
                    Choose Your Mascot
                  </h2>
                  <p className="text-[11px] text-[#6B6A78] truncate">
                    Playing as <strong className="text-[#6C5CE7] font-bold">{displayName}</strong>
                  </p>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-[#E9E5FF] text-[#6C5CE7] text-[10px] font-mono font-bold tracking-wider shrink-0">
                  {code}
                </div>
              </div>

              {/* Main Selection Area: 2-Column on Desktop (md:), Stacked on Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Desktop Left / Mobile Bottom Carousel: 8 Mascot Selector */}
                <div className="order-2 md:order-1 md:col-span-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-black text-[#6B6A78] uppercase tracking-wider">
                      SELECT SQUAD MASCOT
                    </span>
                    <span className="text-[10px] font-bold text-[#6C5CE7]">
                      8 Available
                    </span>
                  </div>

                  {/* Desktop: Clean 2-column grid showing all 8 mascots; Mobile: Horizontal smooth swipe */}
                  <div className="flex md:grid md:grid-cols-2 gap-2 sm:gap-2.5 overflow-x-auto md:overflow-visible py-2 px-1 snap-x scrollbar-thin">
                    {MASCOTS.map((m) => {
                      const isSelected = selectedAvatarId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedAvatarId(m.id)}
                          className={`snap-center shrink-0 w-24 sm:w-28 md:w-auto p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center relative active:scale-95 ${
                            isSelected
                              ? "bg-white border-[#6C5CE7] ring-2 ring-[#6C5CE7] shadow-md shadow-purple-500/15 -translate-y-0.5"
                              : "bg-[#F7F6F2] hover:bg-white border-[#EAE7F2] hover:border-[#DDD6FE]"
                          }`}
                        >
                          {/* Top-Right Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#6C5CE7] text-white flex items-center justify-center shadow-sm z-10">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}

                          <PlayerAvatar
                            avatarId={m.id}
                            size="md"
                            className="mb-1"
                          />
                          <p className="text-[11px] font-black text-[#191820] leading-tight truncate w-full px-0.5">
                            {m.name}
                          </p>
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 truncate max-w-full leading-none"
                            style={{
                              backgroundColor: m.badgeBg,
                              color: m.accentColor,
                            }}
                          >
                            {m.personality}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop Right / Mobile Top: Center Mascot Showcase */}
                <div className="order-1 md:order-2 md:col-span-7 flex flex-col">
                  <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#F7F6F2] via-white to-[#F7F6F2] border border-[#EAE7F2] p-4 sm:p-6 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[290px] overflow-hidden shadow-inner">
                    {/* Background Aura */}
                    <div
                      className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full blur-2xl opacity-20 pointer-events-none transition-colors duration-500"
                      style={{
                        backgroundColor: activeMascot ? activeMascot.accentColor : "#6C5CE7",
                      }}
                    />

                    {activeMascot ? (
                      <div className="relative z-10 flex flex-col items-center w-full animate-fade-in text-center">
                        {/* 3D Mascot Image with defined max height to strictly prevent text overlap */}
                        <div className="h-36 sm:h-44 md:h-48 w-full flex items-center justify-center mb-1 shrink-0 drop-shadow-lg">
                          <PlayerAvatar
                            avatarId={activeMascot.id}
                            size="preview"
                            animation="float"
                            className="max-h-full w-auto object-contain"
                          />
                        </div>

                        {/* Character Metadata - Cleanly separated below image */}
                        <h3 className="text-base sm:text-xl font-black text-[#191820] uppercase tracking-tight mt-1">
                          {activeMascot.name}
                        </h3>

                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mt-1 shadow-sm"
                          style={{
                            backgroundColor: activeMascot.badgeBg,
                            color: activeMascot.accentColor,
                          }}
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{activeMascot.personality}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#6B6A78] italic font-medium mt-1.5 max-w-sm px-2">
                          &ldquo;{activeMascot.description}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center justify-center py-8 text-center text-[#6B6A78] space-y-2">
                        <div className="w-16 h-16 rounded-3xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center border-2 border-dashed border-[#DDD6FE] animate-pulse">
                          <Smile className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-sm font-black text-[#191820]">Tap a Mascot to Choose</p>
                        <p className="text-xs text-[#A09EB1] max-w-xs">
                          Pick any of the 8 Wager Squad mascots to represent your visual identity.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Join Arena Button */}
                  <div className="mt-3 sm:mt-4">
                    <button
                      type="button"
                      onClick={handleJoinGame}
                      disabled={loading || !selectedAvatarId}
                      className="w-full h-[52px] sm:h-[56px] rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : activeMascot ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>JOIN AS {activeMascot.name.toUpperCase()}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <span>SELECT A MASCOT TO JOIN</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Official Platform Rules (Footer reference) */}
        <div className="mt-8 sm:mt-12 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
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
