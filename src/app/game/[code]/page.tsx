"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import { ConnectionBanner } from "@/components/common/ConnectionBanner";
import { BonusPointsModal } from "@/components/common/BonusPointsModal";
import { RefillModal } from "@/components/common/RefillModal";
import { useGameRealtime } from "@/lib/hooks/useGameRealtime";
import { useAuthoritativeTimer } from "@/lib/hooks/useAuthoritativeTimer";
import { formatPoints, formatCountdown } from "@/lib/utils/format";

export default function GameRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [betAmount, setBetAmount] = useState<number>(1000);
  const [showBonusModal, setShowBonusModal] = useState<boolean>(false);
  const [hasSeenBonus, setHasSeenBonus] = useState<boolean>(false);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [initLoading, setInitLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [balanceDelta, setBalanceDelta] = useState<{ amount: number; type: "win" | "loss" } | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  // 1. Initial game code lookup
  useEffect(() => {
    let isMounted = true;
    async function resolveGame() {
      try {
        const res = await fetch(`/api/games/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.toUpperCase(),
            displayName: "Player",
          }),
        });
        const data = await res.json();
        if (data.success && data.data && isMounted) {
          setGameId(data.data.gameId);
          if (data.data.gamePlayerId) {
            setPlayerId(data.data.gamePlayerId);
          }
        } else if (isMounted) {
          setInitError(data.message || "Game not found");
        }
      } catch {
        if (isMounted) setInitError("Network error loading game");
      } finally {
        if (isMounted) setInitLoading(false);
      }
    }
    resolveGame();
    return () => {
      isMounted = false;
    };
  }, [code]);

  // 2. Realtime state hook
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

  // 3. Authoritative countdown timer hook
  const { secondsRemaining, isExpired, percentage } = useAuthoritativeTimer(
    snapshot?.questionStartedAt ?? null,
    snapshot?.questionEndsAt ?? null
  );

  // Instantly sync when authoritative countdown reaches zero to advance round without lag
  useEffect(() => {
    if (
      isExpired &&
      (snapshot?.status === "QUESTION_ACTIVE" ||
        snapshot?.status === "FINAL_ROUND" ||
        snapshot?.status === "QUESTION_CLOSED")
    ) {
      resync();
    }
  }, [isExpired, snapshot?.status, resync]);

  // Re-join lobby automatically if game was reset by host
  useEffect(() => {
    if (snapshot?.status === "LOBBY" && !snapshot.player && gameId) {
      fetch(`/api/games/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          displayName: "Player",
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.gamePlayerId) {
            setPlayerId(d.data.gamePlayerId);
            resync();
          }
        })
        .catch(() => {});
    }
  }, [snapshot?.status, snapshot?.player, gameId, code, resync]);

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
        setBetAmount((prev) => Math.min(prev, balance));
      }
    }
  }, [snapshot?.player?.balance]);

  // Track and animate balance changes only after question timer ends
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

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer("");
  }, [snapshot?.currentQuestion?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnswer) return;
    await submitBet(selectedAnswer, betAmount);
  };

  const handleRefillConfirm = async () => {
    const ok = await requestRefill();
    if (ok) {
      setShowRefillModal(false);
    }
    return ok;
  };

  if (initLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Navbar currentGameCode={code} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
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
  const hasSubmitted = Boolean(snapshot.player?.submittedCurrentQuestion);
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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs font-mono">
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
                {formatPoints(currentBalance)}
              </span>
              <span className="text-[10px] font-bold text-zinc-400">PTS</span>

              {balanceDelta && isQuestionClosed && (
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-full font-mono font-black text-xs animate-bounce shadow-md ${
                    balanceDelta.type === "win"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-600"
                      : "bg-rose-950 text-rose-400 border border-rose-600"
                  }`}
                >
                  {balanceDelta.type === "win"
                    ? `+${formatPoints(balanceDelta.amount)}`
                    : `-${formatPoints(balanceDelta.amount)}`}
                </span>
              )}
            </div>

            {currentBalance === 0 && !isFinished && (
              <button
                onClick={() => setShowRefillModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 font-black text-xs transition-colors"
              >
                Refill
              </button>
            )}
          </div>
        </div>

        {/* 1. LOBBY / WAITING ROOM VIEW */}
        {isLobby && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl bg-zinc-900 border border-zinc-800 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>Lobby Open</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white uppercase">{snapshot.title}</h2>
            <div className="mt-2 text-xs font-mono text-amber-400 font-bold">
              Room Code: <span className="text-lg tracking-widest">{snapshot.gameCode}</span>
            </div>

            <div className="my-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 max-w-sm w-full">
              <div className="flex items-center justify-between text-xs text-zinc-300 mb-2 font-medium">
                <span>Players in Room:</span>
                <span className="font-bold font-mono text-white">{snapshot.totalPlayers} Joined</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-full animate-pulse" />
              </div>
              <p className="text-xs text-amber-400 mt-3 font-semibold">
                Waiting for host to start the quiz...
              </p>
            </div>

            <p className="text-xs text-zinc-500 max-w-xs">
              Keep this screen active. You will receive your 10,000 points automatically when round 1 begins.
            </p>
          </div>
        )}

        {/* 2. GAME PAUSED VIEW */}
        {isPaused && (
          <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-600/50 text-center my-auto">
            <h3 className="text-base font-bold text-amber-200 uppercase">Game Temporarily Paused</h3>
            <p className="text-xs text-zinc-300 mt-1">The host has paused the game. It will resume in a moment.</p>
          </div>
        )}

        {/* 3. LIVE ROUND / QUESTION VIEW */}
        {(isQuestionActive || isQuestionClosed) && snapshot.currentQuestion && (
          <div className="space-y-3">
            {/* Final Round Banner */}
            {snapshot.status === "FINAL_ROUND" && (
              <div className="py-2 px-3 rounded-lg bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider text-center">
                ★ Final Round • Last Question • High-Stakes Bet ★
              </div>
            )}

            {/* Question Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Round {snapshot.currentQuestionIndex} of {snapshot.totalQuestions}
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
                <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
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

              {/* Options Grid (A, B, C, D) - Touch-friendly for mobile */}
              <div className="grid grid-cols-1 gap-2.5">
                {(snapshot.currentQuestion.options as string[]).map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswer === opt;
                  const isCorrectAnswer =
                    isQuestionClosed && snapshot.currentQuestion?.correctAnswer === opt;
                  const isPlayerWrong =
                    isQuestionClosed &&
                    hasSubmitted &&
                    snapshot.player?.lastSubmission?.selectedAnswer === opt &&
                    !snapshot.player?.lastSubmission?.isCorrect;

                  let borderClass = "border-zinc-800 bg-zinc-950 hover:border-zinc-700";
                  if (isSelected && !isQuestionClosed) {
                    borderClass = "border-amber-400 bg-zinc-900 ring-1 ring-amber-400 text-white";
                  }
                  if (isCorrectAnswer) {
                    borderClass = "border-emerald-600 bg-emerald-950/60 text-emerald-200 font-bold";
                  } else if (isPlayerWrong) {
                    borderClass = "border-rose-600 bg-rose-950/60 text-rose-200";
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={hasSubmitted || isQuestionClosed || isExpired}
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

              {/* Round Closed Details */}
              {isQuestionClosed && (
                <div className="mt-4 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                  {snapshot.player?.lastSubmission?.isCorrect ? (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/70 text-emerald-300 font-bold flex items-center justify-between animate-fade-in">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span> Correct Answer!
                      </span>
                      <span className="font-mono text-emerald-400 font-black text-sm">
                        +{formatPoints(snapshot.player.lastSubmission.betAmount)} PTS
                      </span>
                    </div>
                  ) : snapshot.player?.lastSubmission?.selectedAnswer === "UNANSWERED" || !hasSubmitted ? (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-300 font-bold flex items-center justify-between animate-fade-in">
                      <span className="flex items-center gap-1.5">
                        <span className="text-rose-400">⚠️</span> No Answer Submitted
                      </span>
                      <span className="font-mono text-rose-400 font-black text-sm">
                        -1,000 PTS (Penalty)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-300 font-bold flex items-center justify-between animate-fade-in">
                      <span className="flex items-center gap-1.5">
                        <span className="text-rose-400">✕</span> Incorrect Answer
                      </span>
                      <span className="font-mono text-rose-400 font-black text-sm">
                        -{formatPoints(snapshot.player?.lastSubmission?.betAmount || 0)} PTS
                      </span>
                    </div>
                  )}

                  {snapshot.currentQuestion.explanation && (
                    <p className="text-zinc-300 mt-2 border-t border-zinc-800 pt-2 leading-relaxed">
                      <strong className="text-zinc-400">Explanation: </strong>
                      {snapshot.currentQuestion.explanation}
                    </p>
                  )}

                  {/* Automated Progression Indicator */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase tracking-wider font-mono">
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

            {/* Betting & Submission Box (Mobile-friendly Keypad & Presets) */}
            {isQuestionActive && !hasSubmitted && (
              <form
                onSubmit={handleSubmit}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md space-y-4"
              >
                {realtimeError && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
                    {realtimeError}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Bet Amount
                    </label>
                    <span className="text-base font-black font-mono text-amber-400">
                      {formatPoints(betAmount)} PTS
                    </span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, currentBalance)}
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                  />

                  {/* Touch-Friendly Percentage Buttons */}
                  <div className="grid grid-cols-4 gap-2 mt-2.5">
                    {[
                      { label: "MIN", val: 1 },
                      { label: "25%", val: Math.max(1, Math.floor(currentBalance * 0.25)) },
                      { label: "50%", val: Math.max(1, Math.floor(currentBalance * 0.5)) },
                      { label: "ALL IN", val: Math.max(1, currentBalance) },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setBetAmount(btn.val)}
                        className="h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-300 hover:text-white transition-colors"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedAnswer || isSubmitting || isExpired || currentBalance <= 0}
                  className="w-full h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-40 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>LOCK IN BET & SUBMIT →</span>
                  )}
                </button>
              </form>
            )}

            {/* Submitted Wait State */}
            {hasSubmitted && isQuestionActive && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center shadow-md space-y-1.5 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-amber-400 text-xs font-bold font-mono">
                  <span>🔒 Bet of {formatPoints(snapshot.player?.lastSubmission?.betAmount || 0)} PTS Locked</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Your answer is locked in. Balance will update after the countdown timer ends.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. GAME OVER & FINAL RESULTS */}
        {isFinished && (
          <div className="space-y-4">
            <div className="text-center p-6 sm:p-8 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Game Finished</h2>
              <p className="text-xs text-zinc-400 mt-1">Final Authoritative Scoreboard</p>

              {snapshot.player && (
                <div className="mt-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 max-w-sm mx-auto text-left grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Player</span>
                    <strong className="text-white text-sm">{snapshot.player.displayName}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Final Balance</span>
                    <strong className="text-amber-400 text-sm font-mono">{formatPoints(snapshot.player.balance)} pts</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Penalties</span>
                    <strong className="text-rose-400 font-mono">
                      -{formatPoints(snapshot.player.totalRefillFees)} ({snapshot.player.refillCount} refills)
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-bold text-[10px]">Net Score</span>
                    <strong className="text-emerald-400 text-sm font-mono">
                      {formatPoints(snapshot.player.balance - snapshot.player.totalRefillFees)} pts
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Final Standings Table */}
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
                        <td className="py-3 px-3 font-mono text-zinc-300">{formatPoints(entry.balance)}</td>
                        <td className="py-3 px-3 text-zinc-400 font-mono">{entry.refillCount}</td>
                        <td className="py-3 px-3 font-mono font-black text-amber-400">
                          {formatPoints(entry.netScore)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
