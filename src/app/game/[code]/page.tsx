"use client";

import React, { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import { ConnectionBanner } from "@/components/common/ConnectionBanner";
import { BonusPointsModal } from "@/components/common/BonusPointsModal";
import { RefillModal } from "@/components/common/RefillModal";
import { BetAmountSelector } from "@/components/game/BetAmountSelector";
import { useGameRealtime } from "@/lib/hooks/useGameRealtime";
import { useAuthoritativeTimer } from "@/lib/hooks/useAuthoritativeTimer";
import { formatPoints, formatCurrency, formatCountdown } from "@/lib/utils/format";
import { GAME_CONSTANTS } from "@/lib/constants";

export default function GameRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const cleanCode = code.toUpperCase().trim();
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`quiz_player_id_${cleanCode}`) || null;
    }
    return null;
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quiz_player_name") || "Player";
    }
    return "Player";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Gameplay State
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [betAmount, setBetAmount] = useState<number>(GAME_CONSTANTS.MINIMUM_BET);
  const [isGameReset, setIsGameReset] = useState<boolean>(false);
  const [optimisticSubmitted, setOptimisticSubmitted] = useState<boolean>(false);

  // Modals & UI
  const [showBonusModal, setShowBonusModal] = useState<boolean>(false);
  const [hasSeenBonus, setHasSeenBonus] = useState<boolean>(false);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [initLoading, setInitLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Balance change animation tracking
  const [balanceDelta, setBalanceDelta] = useState<{ amount: number; type: "win" | "loss" } | null>(null);
  const prevBalanceRef = useRef<number | null>(null);
  const prevQuestionIdRef = useRef<string | null>(null);
  const hasTriggeredExpireRef = useRef<boolean>(false);
  const isJoiningRef = useRef<boolean>(false);

  // Authoritative player join & session registration
  const joinOrCreatePlayer = useCallback(
    async (preferredName?: string) => {
      if (isJoiningRef.current) return null;
      isJoiningRef.current = true;
      try {
        const nameToUse =
          preferredName?.trim() ||
          (typeof window !== "undefined" ? localStorage.getItem("quiz_player_name") : null) ||
          displayName ||
          "Player";

        const res = await fetch(`/api/games/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: cleanCode,
            displayName: nameToUse,
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setGameId(data.data.gameId);
          if (data.data.gamePlayerId) {
            setPlayerId(data.data.gamePlayerId);
            if (typeof window !== "undefined") {
              localStorage.setItem(`quiz_player_id_${cleanCode}`, data.data.gamePlayerId);
            }
          }
          if (data.data.displayName) {
            setDisplayName(data.data.displayName);
            if (typeof window !== "undefined") {
              localStorage.setItem("quiz_player_name", data.data.displayName);
            }
          }
          setIsGameReset(false);
          setInitError(null);
          return data.data;
        } else {
          setInitError(data.message || "Game not found");
        }
      } catch {
        setInitError("Network error joining game");
      } finally {
        isJoiningRef.current = false;
        setInitLoading(false);
      }
      return null;
    },
    [cleanCode, displayName]
  );

  // 1. Initial game code lookup & player session join on mount
  useEffect(() => {
    let isMounted = true;
    joinOrCreatePlayer().then((data) => {
      if (data && isMounted) {
        setInitLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [joinOrCreatePlayer]);

  // 2. Realtime state hook (pure on-demand: fetches ONCE on join, and on explicit actions/timer transitions)
  const {
    snapshot,
    connectionStatus,
    isSubmitting,
    isRefilling,
    error: realtimeError,
    submitBet,
    requestRefill,
    resync,
  } = useGameRealtime(gameId ?? "", playerId);

  // Auto-rejoin if player record is missing from DB (e.g. after Host clicked Reset Game)
  useEffect(() => {
    if (snapshot && !snapshot.player && !initLoading && !isJoiningRef.current) {
      joinOrCreatePlayer().then(() => {
        resync();
      });
    }
  }, [snapshot, initLoading, joinOrCreatePlayer, resync]);

  // 3. Authoritative countdown timer hook synchronized with server timestamps
  const { secondsRemaining, isExpired, percentage } = useAuthoritativeTimer(
    snapshot?.questionStartedAt ?? null,
    snapshot?.questionEndsAt ?? null
  );

  // 4. Synchronize round transitions when authoritative timer reaches 0
  useEffect(() => {
    if (!snapshot) return;

    const isRoundOrIntermission =
      snapshot.status === "QUESTION_ACTIVE" ||
      snapshot.status === "FINAL_ROUND" ||
      snapshot.status === "QUESTION_CLOSED";

    if (!isRoundOrIntermission) {
      hasTriggeredExpireRef.current = false;
      return;
    }

    if (isExpired && !hasTriggeredExpireRef.current) {
      hasTriggeredExpireRef.current = true;
      resync();

      // Fallback single retry after 1.2s to absorb server-side clock or transaction jitter
      const timer = setTimeout(() => {
        resync();
      }, 1200);
      return () => clearTimeout(timer);
    } else if (!isExpired) {
      hasTriggeredExpireRef.current = false;
    }
  }, [isExpired, snapshot?.status, resync]);

  // Reset selected answer, optimistic state, and balance delta when moving to a new question
  useEffect(() => {
    if (snapshot?.currentQuestion?.id && snapshot.currentQuestion.id !== prevQuestionIdRef.current) {
      prevQuestionIdRef.current = snapshot.currentQuestion.id;
      setSelectedAnswer("");
      setOptimisticSubmitted(false);
      setBalanceDelta(null);
      if (snapshot.player) {
        prevBalanceRef.current = snapshot.player.balance;
      }
    }
  }, [snapshot?.currentQuestion?.id]);

  // Track and animate balance changes only after question timer ends (QUESTION_CLOSED)
  useEffect(() => {
    if (snapshot?.status === "QUESTION_CLOSED" && snapshot.player) {
      const newBal = snapshot.player.balance;
      if (prevBalanceRef.current !== null && newBal !== prevBalanceRef.current) {
        const diff = newBal - prevBalanceRef.current;
        if (diff > 0) {
          setBalanceDelta({ amount: diff, type: "win" });
        } else {
          setBalanceDelta({ amount: Math.abs(diff), type: "loss" });
        }
      } else if (snapshot.player.lastSubmission) {
        const sub = snapshot.player.lastSubmission;
        if (sub.isCorrect) {
          setBalanceDelta({ amount: sub.betAmount, type: "win" });
        } else {
          setBalanceDelta({ amount: sub.betAmount, type: "loss" });
        }
      }
    } else if (snapshot?.status === "QUESTION_ACTIVE" || snapshot?.status === "FINAL_ROUND") {
      setBalanceDelta(null);
      if (snapshot.player) {
        prevBalanceRef.current = snapshot.player.balance;
      }
    }
  }, [snapshot?.status, snapshot?.player?.balance, snapshot?.player?.lastSubmission]);

  // Detect Admin Game Reset
  useEffect(() => {
    if (realtimeError === "Game has been reset by the administrator.") {
      setIsGameReset(true);
    }
  }, [realtimeError]);

  // Trigger login bonus modal on first round start
  useEffect(() => {
    if (
      !hasSeenBonus &&
      (snapshot?.status === "QUESTION_ACTIVE" || snapshot?.status === "FINAL_ROUND") &&
      snapshot?.currentQuestionIndex === 1
    ) {
      setShowBonusModal(true);
      setHasSeenBonus(true);
    }
  }, [snapshot?.status, snapshot?.currentQuestionIndex, hasSeenBonus]);

  // Trigger refill prompt when balance reaches 0
  useEffect(() => {
    if (
      snapshot?.player &&
      snapshot.player.balance === 0 &&
      snapshot.status !== "FINISHED" &&
      !isRefilling
    ) {
      setShowRefillModal(true);
    } else if (snapshot?.player && snapshot.player.balance > 0) {
      setShowRefillModal(false);
    }
  }, [snapshot?.player?.balance, snapshot?.status, isRefilling]);

  // Adjust default bet when player balance changes
  useEffect(() => {
    if (snapshot?.player) {
      const balance = snapshot.player.balance;
      if (balance > 0) {
        setBetAmount((prev) => Math.max(GAME_CONSTANTS.MINIMUM_BET, Math.min(prev, balance)));
      }
    }
  }, [snapshot?.player?.balance]);

  // Handle Bet Submission with Instant Optimistic UI Lock (0ms latency feel)
  const handleBetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !snapshot?.currentQuestion ||
      !selectedAnswer ||
      isSubmitting ||
      isExpired ||
      snapshot.player?.submittedCurrentQuestion ||
      optimisticSubmitted
    ) {
      return;
    }

    // Lock in UI immediately in 0ms!
    setOptimisticSubmitted(true);

    const response = await submitBet(snapshot.currentQuestion.id, selectedAnswer, betAmount);

    if (!response || !response.success) {
      setOptimisticSubmitted(false);
      if (response?.code === "GAME_RESET" || response?.code === "UNAUTHORIZED") {
        setIsGameReset(true);
        await joinOrCreatePlayer();
        await resync();
      }
    }
  };

  const handleRefillConfirm = async () => {
    const ok = await requestRefill();
    if (ok) {
      setShowRefillModal(false);
      setBetAmount(GAME_CONSTANTS.MINIMUM_BET);
    }
    return ok;
  };

  if (initLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Navbar currentGameCode={code} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-zinc-400 font-mono">Entering room {code}...</p>
        </div>
      </div>
    );
  }

  if (initError || !snapshot) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Navbar currentGameCode={code} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
            <h2 className="text-base font-bold text-white">Room Unavailable</h2>
            <p className="text-xs text-zinc-400 mt-2 mb-5">
              {initError || "This game does not exist or has already ended."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold"
            >
              ← Back to Join Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLobby = snapshot.status === "DRAFT" || snapshot.status === "LOBBY";
  const isQuestionActive = snapshot.status === "QUESTION_ACTIVE" || snapshot.status === "FINAL_ROUND";
  const isQuestionClosed = snapshot.status === "QUESTION_CLOSED";
  const isFinished = snapshot.status === "FINISHED";
  const isPaused = snapshot.status === "PAUSED";
  const hasSubmitted = Boolean(snapshot.player?.submittedCurrentQuestion || optimisticSubmitted);
  const currentBalance = snapshot.player?.balance ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-amber-400 selection:text-zinc-950">
      <Navbar currentGameCode={snapshot.gameCode} gameTitle={snapshot.title} />
      <ConnectionBanner status={connectionStatus} onResync={resync} />

      <BonusPointsModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        startingBalance={snapshot.rules.startingBalance}
      />

      <RefillModal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        onConfirmRefill={handleRefillConfirm}
        isRefilling={isRefilling}
        refillAmount={snapshot.rules.refillAmount}
        refillFee={snapshot.rules.refillFee}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col justify-start">
        {/* Top Status Bar: Player Nickname & Live Balance */}
        <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs font-mono">
              {snapshot.player?.displayName.charAt(0).toUpperCase() || "P"}
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">
                {snapshot.player?.displayName || "Player"}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Refills: {snapshot.player?.refillCount || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 relative">
              <span className="text-[10px] text-zinc-500 font-bold uppercase hidden sm:inline">Balance:</span>
              <span className="text-sm sm:text-base font-black font-mono text-amber-400 transition-all duration-300">
                {formatCurrency(currentBalance)}
              </span>

              {balanceDelta && isQuestionClosed && (
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-full font-mono font-black text-xs animate-bounce shadow-md ${
                    balanceDelta.type === "win"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-600"
                      : "bg-rose-950 text-rose-400 border border-rose-600"
                  }`}
                >
                  {balanceDelta.type === "win"
                    ? `+${formatCurrency(balanceDelta.amount)}`
                    : `-${formatCurrency(balanceDelta.amount)}`}
                </span>
              )}
            </div>

            {/* On-Demand Refresh Button */}
            <button
              onClick={resync}
              className="h-8 sm:h-9 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
              title="Refresh latest game state"
            >
              <span>↻</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {currentBalance === 0 && !isFinished && (
              <button
                onClick={() => setShowRefillModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 font-black text-xs transition-colors shadow-sm"
              >
                Refill
              </button>
            )}
          </div>
        </div>

        {/* 1. ADMIN RESET ALERT */}
        {isGameReset && (
          <div className="mb-4 p-5 rounded-2xl bg-rose-950/70 border border-rose-800 text-center space-y-3 animate-fade-in">
            <h3 className="text-sm font-black text-rose-200 uppercase tracking-wider">
              ⚠️ Game Reset by Host
            </h3>
            <p className="text-xs text-zinc-300">
              The administrator has reset the game session. All scores and rounds have been restarted.
            </p>
            <button
              onClick={async () => {
                setIsGameReset(false);
                await joinOrCreatePlayer();
                await resync();
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-md transition-colors"
            >
              ↻ Return to Lobby
            </button>
          </div>
        )}

        {/* 2. LOBBY VIEW (Waiting for host to start) */}
        {isLobby && !isGameReset && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl bg-zinc-900 border border-zinc-800 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>Lobby Open</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white uppercase">{snapshot.title}</h2>
            <div className="mt-2 text-xs font-mono text-amber-400 font-bold">
              Room Code: <span className="text-lg tracking-widest">{snapshot.gameCode}</span>
            </div>

            {/* Nickname badge with in-lobby edit support */}
            <div className="mt-4 flex flex-col items-center justify-center">
              {!isEditingName ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Playing as:</span>
                  <span className="text-xs font-bold font-mono text-white px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700">
                    {displayName}
                  </span>
                  <button
                    onClick={() => {
                      setNameInput(displayName);
                      setIsEditingName(true);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const trimmed = nameInput.trim();
                    if (trimmed.length >= 2) {
                      setIsEditingName(false);
                      await joinOrCreatePlayer(trimmed);
                      await resync();
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={25}
                    className="px-2.5 py-1 text-xs rounded-lg bg-zinc-950 border border-amber-400 text-white font-mono outline-none"
                    placeholder="New nickname"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-amber-400 text-zinc-950 text-xs font-bold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            <div className="my-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 max-w-sm w-full">
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-2 font-medium">
                <span>Players Joined:</span>
                <span className="font-bold font-mono text-white">{snapshot.totalPlayers} Players</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-full animate-pulse" />
              </div>
              <p className="text-xs text-amber-400 mt-3 font-semibold">
                Waiting for host to start the game...
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={resync}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                >
                  <span>↻</span> Check If Game Started
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500 max-w-xs">
              Keep this screen open. You will receive your {formatCurrency(snapshot.rules.startingBalance)} points automatically when the quiz starts.
            </p>
          </div>
        )}

        {/* 3. GAME PAUSED VIEW */}
        {isPaused && (
          <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-600/50 text-center my-auto">
            <h3 className="text-base font-bold text-amber-200 uppercase">Game Temporarily Paused</h3>
            <p className="text-xs text-zinc-300 mt-1">The host has paused the game. It will resume shortly.</p>
          </div>
        )}

        {/* 4. LIVE ROUND / QUESTION VIEW WITH SYNCHRONIZED TIMER */}
        {(isQuestionActive || isQuestionClosed) && snapshot.currentQuestion && (
          <div className="space-y-4">
            {/* Final Round Banner */}
            {snapshot.status === "FINAL_ROUND" && (
              <div className="py-2 px-3 rounded-lg bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider text-center">
                ★ Final Round • Last Question • High-Stakes Bet ★
              </div>
            )}

            {/* Question Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Question {snapshot.currentQuestionIndex} of {snapshot.totalQuestions}
                </span>

                {isQuestionClosed ? (
                  <div className="px-3 py-1 rounded bg-amber-950/80 border border-amber-600/60 text-amber-400 font-mono text-xs font-black flex items-center gap-1.5 animate-pulse">
                    <span>Next Round:</span>
                    <span>⏱ {formatCountdown(secondsRemaining)}</span>
                  </div>
                ) : (
                  <div
                    className={`px-3 py-1 rounded font-mono font-black text-xs ${
                      isExpired
                        ? "bg-zinc-800 text-zinc-500 border border-zinc-700"
                        : secondsRemaining <= 5
                        ? "bg-rose-950 text-rose-300 border border-rose-800 animate-pulse"
                        : "bg-zinc-950 text-amber-400 border border-zinc-700"
                    }`}
                  >
                    ⏱ {formatCountdown(secondsRemaining)}
                  </div>
                )}
              </div>

              {/* Countdown Progress Bar */}
              {isQuestionActive && (
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      secondsRemaining <= 5 ? "bg-rose-500" : "bg-amber-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}

              {/* Question Text */}
              <h3 className="text-base sm:text-xl font-bold text-white mt-4 mb-5 leading-snug">
                {snapshot.currentQuestion.questionText}
              </h3>

              {/* Options Grid (A, B, C, D) */}
              <div className="grid grid-cols-1 gap-2.5">
                {(snapshot.currentQuestion.options as string[]).map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswer === opt;
                  const isCorrectAnswer =
                    isQuestionClosed &&
                    snapshot.currentQuestion?.correctAnswer?.trim().toLowerCase() === opt.trim().toLowerCase();
                  const isPlayerWrong =
                    isQuestionClosed &&
                    hasSubmitted &&
                    snapshot.player?.lastSubmission?.selectedAnswer?.trim().toLowerCase() === opt.trim().toLowerCase() &&
                    !snapshot.player?.lastSubmission?.isCorrect;

                  let borderClass = "border-zinc-800 bg-zinc-950 hover:border-zinc-700";
                  if (isSelected && !isQuestionClosed) {
                    borderClass = "border-amber-400 bg-zinc-900 ring-1 ring-amber-400 text-white";
                  }
                  if (isCorrectAnswer) {
                    borderClass = "border-emerald-600 bg-emerald-950/70 text-emerald-200 font-bold shadow-sm";
                  } else if (isPlayerWrong) {
                    borderClass = "border-rose-600 bg-rose-950/70 text-rose-200 shadow-sm";
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={hasSubmitted || isQuestionClosed || isExpired || isSubmitting}
                      onClick={() => setSelectedAnswer(opt)}
                      className={`min-h-[50px] p-3.5 rounded-xl border text-left flex items-center justify-between transition-all active:scale-[0.99] ${borderClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 font-mono">
                          {letter}
                        </span>
                        <span className="text-sm font-semibold text-zinc-100">{opt}</span>
                      </div>

                      {isCorrectAnswer && (
                        <span className="text-xs font-bold text-emerald-400 font-mono">✓ CORRECT</span>
                      )}
                      {isPlayerWrong && (
                        <span className="text-xs font-bold text-rose-400 font-mono">✕ WRONG</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Round Closed Details & Correct Answer Reveal */}
              {isQuestionClosed && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs animate-fade-in space-y-3">
                  {snapshot.player?.lastSubmission?.isCorrect ? (
                    <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-400 text-sm">✓</span> Correct Answer!
                      </span>
                      <span className="font-mono text-emerald-400 font-black text-sm">
                        +{formatCurrency(snapshot.player.lastSubmission.betAmount)}
                      </span>
                    </div>
                  ) : snapshot.player?.lastSubmission?.selectedAnswer === "UNANSWERED" || !hasSubmitted ? (
                    <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="text-rose-400 text-sm">⚠️</span> No Answer Submitted
                      </span>
                      <span className="font-mono text-rose-400 font-black text-sm">
                        -1,000 PTS (Penalty)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="text-rose-400 text-sm">✕</span> Incorrect Answer
                      </span>
                      <span className="font-mono text-rose-400 font-black text-sm">
                        -{formatCurrency(snapshot.player?.lastSubmission?.betAmount || 0)}
                      </span>
                    </div>
                  )}

                  {snapshot.currentQuestion.explanation && (
                    <p className="text-zinc-300 border-t border-zinc-800 pt-2.5 leading-relaxed">
                      <strong className="text-zinc-400">Explanation: </strong>
                      {snapshot.currentQuestion.explanation}
                    </p>
                  )}

                  {/* Review Countdown Indicator */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase tracking-wider font-mono">
                    <span>
                      {snapshot.currentQuestionIndex >= snapshot.totalQuestions
                        ? "Final results in"
                        : "Next round in"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                      {secondsRemaining}s
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Controlled Betting Amount Box */}
            {isQuestionActive && !hasSubmitted && (
              <form
                onSubmit={handleBetSubmit}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4"
              >
                {realtimeError && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
                    {realtimeError}
                  </div>
                )}

                <BetAmountSelector
                  balance={currentBalance}
                  betAmount={betAmount}
                  onBetAmountChange={setBetAmount}
                  disabled={isSubmitting || isExpired}
                  minBet={GAME_CONSTANTS.MINIMUM_BET}
                />

                {/* BET SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={
                    !selectedAnswer ||
                    isSubmitting ||
                    isExpired ||
                    betAmount < GAME_CONSTANTS.MINIMUM_BET ||
                    betAmount > currentBalance
                  }
                  className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-40 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>PROCESSING...</span>
                    </span>
                  ) : (
                    <span>LOCK IN BET {formatCurrency(betAmount)} →</span>
                  )}
                </button>
              </form>
            )}

            {/* Submitted Wait State (Locked in until timer expires) */}
            {hasSubmitted && isQuestionActive && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center shadow-md space-y-2 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-amber-400 text-xs font-bold font-mono">
                  <span>🔒 Bet of {formatCurrency(snapshot.player?.lastSubmission?.betAmount || betAmount)} Locked</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Your answer is locked in. Balance will update after the countdown timer ends.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. GAME COMPLETED VIEW */}
        {isFinished && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center p-6 sm:p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
                ★ Game Finished ★
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Final Authoritative Scoreboard</h2>
              <p className="text-xs text-zinc-400 mt-1">Quiz Completed</p>

              {snapshot.player && (
                <div className="mt-5 p-5 rounded-xl bg-zinc-950 border border-zinc-800 max-w-md mx-auto text-left grid grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Starting Balance</span>
                    <strong className="text-zinc-200 text-sm font-mono">
                      {formatCurrency(snapshot.rules.startingBalance)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Final Balance</span>
                    <strong className="text-amber-400 text-base font-black font-mono">
                      {formatCurrency(snapshot.player.balance)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Questions Answered</span>
                    <strong className="text-white text-sm font-mono">
                      {snapshot.totalQuestions} Questions
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Wins / Losses</span>
                    <strong className="text-white text-sm font-mono">
                      <span className="text-emerald-400">{snapshot.player.totalWins ?? 0}W</span>
                      {" / "}
                      <span className="text-rose-400">{snapshot.player.totalLosses ?? 0}L</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Total Wagered</span>
                    <strong className="text-zinc-300 text-sm font-mono">
                      {formatCurrency(snapshot.player.totalWagered ?? 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Net Result</span>
                    <strong
                      className={`text-sm font-black font-mono ${
                        (snapshot.player.netResult ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {(snapshot.player.netResult ?? 0) >= 0
                        ? `+${formatCurrency(snapshot.player.netResult ?? 0)}`
                        : `-${formatCurrency(Math.abs(snapshot.player.netResult ?? 0))}`}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Final Standings Table */}
            {snapshot.leaderboard.length > 0 && (
              <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Final Leaderboard
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Player</th>
                        <th className="py-2.5 px-3">Balance</th>
                        <th className="py-2.5 px-3">Refills</th>
                        <th className="py-2.5 px-3">Net Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-medium">
                      {snapshot.leaderboard.map((entry) => (
                        <tr
                          key={entry.gamePlayerId}
                          className={entry.isCurrentPlayer ? "bg-zinc-800 font-bold text-white" : "text-zinc-300"}
                        >
                          <td className="py-3 px-3 font-mono font-bold">#{entry.rank}</td>
                          <td className="py-3 px-3">{entry.displayName}</td>
                          <td className="py-3 px-3 font-mono text-zinc-300">{formatCurrency(entry.balance)}</td>
                          <td className="py-3 px-3 text-zinc-400 font-mono">{entry.refillCount}</td>
                          <td className="py-3 px-3 font-mono font-black text-amber-400">
                            {formatCurrency(entry.netScore)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
