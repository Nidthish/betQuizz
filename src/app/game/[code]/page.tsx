"use client";

import React, { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import { ConnectionBanner } from "@/components/common/ConnectionBanner";
import { BonusPointsModal } from "@/components/common/BonusPointsModal";
import { RefillModal } from "@/components/common/RefillModal";
import { BetAmountSelector } from "@/components/game/BetAmountSelector";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { useGameRealtime } from "@/lib/hooks/useGameRealtime";
import { useAuthoritativeTimer } from "@/lib/hooks/useAuthoritativeTimer";
import { formatPoints, formatCurrency, formatCountdown } from "@/lib/utils/format";
import { GAME_CONSTANTS } from "@/lib/constants";
import { triggerWinConfetti } from "@/lib/utils/confetti";
import { sounds } from "@/lib/utils/sound";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Wallet,
  RotateCw,
  Users,
  Crown,
  BookOpen,
  Timer,
  Check,
  CheckCircle2,
  X,
  XCircle,
  Lock,
  Coins,
  HelpCircle,
  Trophy,
  Layers,
  TrendingUp,
  Volume2,
  VolumeX,
} from "lucide-react";

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
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());

  // Balance change animation tracking
  const [balanceDelta, setBalanceDelta] = useState<{ amount: number; type: "win" | "loss" } | null>(null);
  const prevBalanceRef = useRef<number | null>(null);
  const prevQuestionIdRef = useRef<string | null>(null);
  const hasTriggeredExpireRef = useRef<boolean>(false);
  const hasTriggeredSoundRef = useRef<string | null>(null);
  const lastTickSecondsRef = useRef<number | null>(null);
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
            avatarId: (typeof window !== "undefined" ? localStorage.getItem("quiz_player_avatar") : null) || undefined,
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
          if (data.data.avatarId && typeof window !== "undefined") {
            localStorage.setItem("quiz_player_avatar", data.data.avatarId);
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

  useEffect(() => {
    if (snapshot && !snapshot.player && !initLoading && !isJoiningRef.current) {
      joinOrCreatePlayer().then(() => {
        resync();
      });
    }
  }, [snapshot, initLoading, joinOrCreatePlayer, resync]);

  const { secondsRemaining, isExpired, percentage } = useAuthoritativeTimer(
    snapshot?.questionStartedAt ?? null,
    snapshot?.questionEndsAt ?? null
  );

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

      const timer = setTimeout(() => {
        resync();
      }, 1200);
      return () => clearTimeout(timer);
    } else if (!isExpired) {
      hasTriggeredExpireRef.current = false;
    }
  }, [isExpired, snapshot?.status, resync]);

  useEffect(() => {
    if (snapshot?.currentQuestion?.id && snapshot.currentQuestion.id !== prevQuestionIdRef.current) {
      prevQuestionIdRef.current = snapshot.currentQuestion.id;
      hasTriggeredSoundRef.current = null;
      lastTickSecondsRef.current = null;
      setSelectedAnswer("");
      setOptimisticSubmitted(false);
      setBalanceDelta(null);
      if (snapshot.player) {
        prevBalanceRef.current = snapshot.player.balance;
      }
    }
  }, [snapshot?.currentQuestion?.id]);

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

      // Kahoot-Style Win / Loss Sound & Confetti Effect
      if (hasTriggeredSoundRef.current !== snapshot.currentQuestion?.id) {
        hasTriggeredSoundRef.current = snapshot.currentQuestion?.id || "resolved";
        if (snapshot.player.lastSubmission?.isCorrect) {
          triggerWinConfetti();
          sounds.playCorrect();
        } else if (snapshot.player.lastSubmission && !snapshot.player.lastSubmission.isCorrect) {
          sounds.playIncorrect();
        }
      }
    } else if (snapshot?.status === "QUESTION_ACTIVE" || snapshot?.status === "FINAL_ROUND") {
      setBalanceDelta(null);
      if (snapshot.player) {
        prevBalanceRef.current = snapshot.player.balance;
      }
    }
  }, [snapshot?.status, snapshot?.player?.balance, snapshot?.player?.lastSubmission, snapshot?.currentQuestion?.id]);

  // Kahoot-Style Urgency Clock Ticks on Last 5 Seconds
  useEffect(() => {
    const active = snapshot?.status === "QUESTION_ACTIVE" || snapshot?.status === "FINAL_ROUND";
    if (active && secondsRemaining <= 5 && secondsRemaining > 0) {
      if (lastTickSecondsRef.current !== secondsRemaining) {
        lastTickSecondsRef.current = secondsRemaining;
        sounds.playTick();
      }
    }
  }, [snapshot?.status, secondsRemaining]);

  useEffect(() => {
    if (realtimeError === "Game has been reset by the administrator.") {
      setIsGameReset(true);
    }
  }, [realtimeError]);

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

  useEffect(() => {
    if (snapshot?.player) {
      const balance = snapshot.player.balance;
      if (balance > 0) {
        setBetAmount((prev) => Math.max(GAME_CONSTANTS.MINIMUM_BET, Math.min(prev, balance)));
      }
    }
  }, [snapshot?.player?.balance]);

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
      <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
        <Navbar currentGameCode={code} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-[#6C5CE7] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-xs text-[#6B6A78] font-bold">Entering room {code}...</p>
        </div>
      </div>
    );
  }

  if (initError || !snapshot) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
        <Navbar currentGameCode={code} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white border border-[#EAE7F2] text-center shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#FDEEEC] text-[#EF5350] flex items-center justify-center mx-auto mb-3 shadow-sm">
              <AlertTriangle className="w-7 h-7 text-[#EF5350]" />
            </div>
            <h2 className="text-lg font-black text-[#191820]">Room Unavailable</h2>
            <p className="text-xs text-[#6B6A78] mt-2 mb-6">
              {initError || "This game does not exist or has already ended."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#FF7417] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#e6640e] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Join Screen</span>
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
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
      {/* Header Bar */}
      <Navbar
        variant={isQuestionActive || isFinished ? "host" : "player"}
        currentGameCode={snapshot.gameCode}
        gameTitle={snapshot.title}
      />
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

      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-7 flex flex-col justify-start">
        {/* Player Profile Header Bar (Matching Screenshots 3, 7, 10) */}
        <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between p-3 sm:p-4 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm gap-2">
          {/* Avatar & Player Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <PlayerAvatar avatarId={snapshot.player?.avatarId} size="md" glow className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-[#191820] leading-tight truncate max-w-[120px] sm:max-w-[200px]">
                {snapshot.player?.displayName || "Player"}
              </p>
              <p className="text-[10px] sm:text-xs text-[#6B6A78] font-bold mt-0.5 whitespace-nowrap">
                Refills: {snapshot.player?.refillCount || 0}
              </p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-[#EAE7F2] hidden md:block" />

          {/* Balance Pill & Refresh */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-[#FFF3E8] border border-[#FFD9BE] whitespace-nowrap">
              <Wallet className="w-4 h-4 text-[#FF7417] shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] sm:text-[10px] text-[#6B6A78] font-bold uppercase leading-none">Balance</span>
                <span className="text-xs sm:text-sm font-black font-mono text-[#FF7417] leading-tight">
                  ₹{formatPoints(currentBalance)}
                </span>
              </div>

              {balanceDelta && isQuestionClosed && (
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-full font-mono font-black text-[10px] sm:text-xs whitespace-nowrap shadow-sm animate-float-fade ${
                    balanceDelta.type === "win"
                      ? "bg-[#EAF9F2] text-[#22B978] border border-[#A7F3D0]"
                      : "bg-[#FDEEEC] text-[#EF5350] border border-[#FCA5A5]"
                  }`}
                >
                  {balanceDelta.type === "win"
                    ? `+₹${formatPoints(balanceDelta.amount)}`
                    : `-₹${formatPoints(balanceDelta.amount)}`}
                </span>
              )}
            </div>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const next = sounds.toggleMute();
                setIsMuted(next);
              }}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
              title={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#EF5350]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#6C5CE7]" />
              )}
              <span className="hidden sm:inline">{isMuted ? "Muted" : "Sound"}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={resync}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
              title="Refresh latest game state"
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {currentBalance === 0 && !isFinished && (
              <button
                onClick={() => setShowRefillModal(true)}
                className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-2xl bg-[#EF5350] hover:bg-[#dc2626] text-white font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all shadow-sm shrink-0 whitespace-nowrap"
              >
                Refill
              </button>
            )}
          </div>
        </div>

        {/* 1. ADMIN RESET ALERT */}
        {isGameReset && (
          <div className="mb-5 p-5 sm:p-6 rounded-3xl bg-[#FDEEEC] border border-[#FCA5A5] text-center space-y-3 animate-fade-in shadow-sm">
            <h3 className="text-sm font-black text-[#EF5350] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#EF5350]" />
              <span>Game Reset by Host</span>
            </h3>
            <p className="text-xs text-[#6B6A78]">
              The administrator has reset the game session. All scores and rounds have been restarted.
            </p>
            <button
              onClick={async () => {
                setIsGameReset(false);
                await joinOrCreatePlayer();
                await resync();
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Return to Lobby</span>
            </button>
          </div>
        )}

        {/* 2. LOBBY VIEW (Matching Screenshot 7) */}
        {isLobby && !isGameReset && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-7 sm:p-10 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm my-auto">
            {/* Lobby Open Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E9E5FF] text-[#6C5CE7] text-xs font-black uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#22B978] animate-pulse" />
              <span>LOBBY OPEN</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#191820] uppercase tracking-tight">
              {snapshot.title}
            </h2>

            {/* Room Code Badge */}
            <div className="mt-3 px-4 py-1.5 rounded-full bg-[#F0EEFF] text-[#6C5CE7] text-sm font-mono font-black tracking-wider inline-flex items-center gap-2">
              <span className="text-[#6B6A78] font-bold">Room Code:</span>
              <span className="text-base text-[#6C5CE7] font-black">{snapshot.gameCode}</span>
            </div>

            {/* Playing as Name & Change link */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs">
              {!isEditingName ? (
                <>
                  <span className="text-[#6B6A78]">Playing as:</span>
                  <strong className="text-[#191820] font-black">{displayName}</strong>
                  <span className="text-[#DDD6FE]">|</span>
                  <button
                    onClick={() => {
                      setNameInput(displayName);
                      setIsEditingName(true);
                    }}
                    className="text-[#6C5CE7] hover:underline font-bold transition-colors"
                  >
                    Change Nickname
                  </button>
                </>
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
                    className="h-[50px] px-4 text-sm rounded-2xl bg-[#F4F1FF] border border-[#6C5CE7] text-[#191820] font-bold outline-none"
                    placeholder="New nickname"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="h-[50px] px-5 rounded-2xl bg-[#FF7417] text-white text-xs font-black uppercase tracking-wider"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-1 text-xs text-[#6B6A78] hover:text-[#191820]"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* Players Joined Box (Matching Screenshot 7) */}
            <div className="my-6 sm:my-7 p-4 sm:p-5 rounded-2xl bg-[#F0EEFF] border border-[#DDD6FE] max-w-sm w-full">
              <div className="flex items-center justify-between text-xs text-[#191820] mb-3 font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#6C5CE7]" />
                  <span>Players Joined</span>
                </span>
                <span className="font-mono text-[#6C5CE7] font-black text-sm">
                  {snapshot.totalPlayers} {snapshot.totalPlayers === 1 ? "Player" : "Players"}
                </span>
              </div>
              <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                <div className="bg-[#6C5CE7] h-full w-full animate-pulse rounded-full" />
              </div>
              <p className="text-xs text-[#6C5CE7] mt-3 font-bold flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22B978] animate-ping" />
                <span>Live sync active • Game starts automatically when host begins</span>
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={resync}
                  className="w-full py-3 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>CHECK IF GAME STARTED</span>
                </button>
              </div>
            </div>

            {/* Squad in Lobby Cards Grid */}
            <div className="w-full mt-6 text-left border-t border-[#EAE7F2] pt-5">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#6C5CE7] flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>SQUAD IN ROOM ({snapshot.totalPlayers})</span>
                </h3>
                <span className="text-[11px] text-[#A09EB1] font-medium">Realtime presence</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {(snapshot.joinedPlayers && snapshot.joinedPlayers.length > 0
                  ? snapshot.joinedPlayers
                  : [{ id: playerId || "you", displayName: displayName, avatarId: snapshot.player?.avatarId }]
                ).map((p) => {
                  const isYou = p.id === playerId || p.displayName === displayName;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2.5 p-2 rounded-2xl border transition-all ${
                        isYou
                          ? "bg-[#F0EEFF] border-[#6C5CE7] shadow-sm"
                          : "bg-[#F7F6F2] border-[#EAE7F2]"
                      }`}
                    >
                      <PlayerAvatar avatarId={p.avatarId} size="sm" glow={isYou} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#191820] truncate">
                          {p.displayName}
                        </p>
                        {isYou && (
                          <span className="text-[9px] font-black text-[#6C5CE7] uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-[#6B6A78] max-w-xs font-medium mt-4">
              Keep this screen open. You will receive your ₹{formatPoints(snapshot.rules.startingBalance)} points automatically when the quiz starts.
            </p>
          </div>
        )}

        {/* 3. GAME PAUSED VIEW */}
        {isPaused && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#FFF3E8] border border-[#FFD9BE] text-center my-auto shadow-sm">
            <h3 className="text-base font-black text-[#FF7417] uppercase">Game Temporarily Paused</h3>
            <p className="text-xs text-[#6B6A78] mt-1">The host has paused the game. It will resume shortly.</p>
          </div>
        )}

        {/* 4. LIVE ROUND / QUESTION VIEW WITH SYNCHRONIZED TIMER */}
        {(isQuestionActive || isQuestionClosed) && snapshot.currentQuestion && (
          <div className="space-y-4">
            {/* Final Round Banner (Matching Screenshot 11) */}
            {snapshot.status === "FINAL_ROUND" && (
              <div className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl bg-gradient-to-r from-[#FFB800] via-[#FF7417] to-[#FFB800] text-white text-[11px] sm:text-xs font-black uppercase tracking-wider text-center shadow-md flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">FINAL ROUND • LAST QUESTION • HIGH-STAKES BET</span>
                <Crown className="w-4 h-4 text-white shrink-0" />
              </div>
            )}

            {/* Question Card (Matching Screenshots 9, 10, 11) */}
            <div className="p-4 sm:p-7 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm">
              <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-[#EAE7F2] gap-2">
                <div className="px-2.5 sm:px-3.5 py-1 rounded-full bg-[#F0EEFF] text-[#6C5CE7] text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-[#6C5CE7] shrink-0" />
                  <span>
                    Question {snapshot.currentQuestionIndex} of {snapshot.totalQuestions}
                  </span>
                </div>

                {/* Progress bar in middle (desktop only) */}
                <div className="flex-1 mx-3 bg-[#F0EEFF] h-2 rounded-full overflow-hidden hidden md:block">
                  <div
                    className="h-full bg-[#6C5CE7] transition-all duration-300 rounded-full"
                    style={{ width: `${(snapshot.currentQuestionIndex / snapshot.totalQuestions) * 100}%` }}
                  />
                </div>

                {isQuestionClosed ? (
                  <div className="px-2.5 sm:px-3 py-1 rounded-full bg-[#FFF3E8] border border-[#FFD9BE] text-[#FF7417] font-mono text-[11px] sm:text-xs font-black flex items-center gap-1.5 animate-pulse whitespace-nowrap shrink-0">
                    <Timer className="w-3.5 h-3.5 text-[#FF7417] shrink-0" />
                    <span className="hidden xs:inline sm:inline">Next Round:</span>
                    <span>{formatCountdown(secondsRemaining)}</span>
                  </div>
                ) : (
                  <div
                    className={`px-2.5 sm:px-3.5 py-1 rounded-full font-mono font-black text-[11px] sm:text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      secondsRemaining <= 5
                        ? "bg-[#FDEEEC] text-[#EF5350] border border-[#FCA5A5] animate-pulse"
                        : "bg-[#FFF3E8] text-[#FF7417] border border-[#FFD9BE]"
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatCountdown(secondsRemaining)}</span>
                  </div>
                )}
              </div>

              {/* Countdown Progress Bar */}
              {isQuestionActive && (
                <div className="w-full bg-[#F7F6F2] h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 rounded-full ${
                      secondsRemaining <= 5 ? "bg-[#EF5350]" : "bg-[#FF7417]"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}

              {/* Question Text */}
              <h3 className="text-lg sm:text-2xl font-black text-[#191820] mt-3.5 sm:mt-4 mb-4 sm:mb-5 leading-snug">
                {snapshot.currentQuestion.questionText}
              </h3>

              {/* Options 2x2 Grid (Matching Screenshots 9, 10, 11) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  let cardClasses = "bg-[#F7F6F2] hover:bg-[#F0EEFF] border-[#EAE7F2] text-[#191820]";
                  let letterBadgeClasses = "bg-[#F0EEFF] text-[#6C5CE7]";

                  if (isSelected && !isQuestionClosed) {
                    cardClasses = "bg-[#6C5CE7] text-white border-[#6C5CE7] shadow-md";
                    letterBadgeClasses = "bg-white/20 text-white";
                  }
                  if (isCorrectAnswer) {
                    cardClasses = "bg-[#EAF9F2] border-[#22B978] text-[#22B978] font-bold shadow-sm ring-2 ring-[#22B978]/30 animate-correct-pulse";
                    letterBadgeClasses = "bg-[#22B978]/15 text-[#22B978]";
                  } else if (isPlayerWrong) {
                    cardClasses = "bg-[#FDEEEC] border-[#EF5350] text-[#EF5350] shadow-sm";
                    letterBadgeClasses = "bg-[#EF5350]/15 text-[#EF5350]";
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={hasSubmitted || isQuestionClosed || isExpired || isSubmitting}
                      onClick={() => {
                        sounds.playSelect();
                        setSelectedAnswer(opt);
                      }}
                      className={`min-h-[52px] sm:min-h-[56px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] gap-2.5 ${cardClasses}`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <span
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs font-mono transition-colors shrink-0 ${letterBadgeClasses}`}
                        >
                          {letter}
                        </span>
                        <span className="text-xs sm:text-sm font-bold break-words leading-tight flex-1">{opt}</span>
                      </div>

                      {isSelected && !isQuestionClosed && (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-[#6C5CE7] flex items-center justify-center shadow-sm shrink-0">
                          <Check className="w-3.5 h-3.5 text-[#6C5CE7]" />
                        </div>
                      )}
                      {isCorrectAnswer && (
                        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-[#22B978] font-mono shrink-0 whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" />
                          <span>CORRECT</span>
                        </span>
                      )}
                      {isPlayerWrong && (
                        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-[#EF5350] font-mono shrink-0 whitespace-nowrap">
                          <X className="w-3.5 h-3.5" />
                          <span>WRONG</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Round Closed Details & Correct Answer Reveal */}
              {isQuestionClosed && (
                <div className="mt-5 p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] text-xs animate-fade-in space-y-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      avatarId={snapshot.player?.avatarId}
                      size="lg"
                      animation={snapshot.player?.lastSubmission?.isCorrect ? "bounce" : "shake"}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                  {snapshot.player?.lastSubmission?.isCorrect ? (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-[#EAF9F2] border border-[#A7F3D0] text-[#22B978] font-black flex items-center justify-between text-xs sm:text-sm gap-2 shadow-sm animate-correct-pulse">
                      <span className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-[#22B978] shrink-0" />
                        <span className="truncate">Correct Answer!</span>
                      </span>
                      <span className="font-mono shrink-0 whitespace-nowrap">
                        +{formatCurrency(snapshot.player.lastSubmission.betAmount)}
                      </span>
                    </div>
                  ) : snapshot.player?.lastSubmission?.selectedAnswer === "UNANSWERED" || !hasSubmitted ? (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] font-black flex items-center justify-between text-xs sm:text-sm gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="w-4 h-4 text-[#EF5350] shrink-0" />
                        <span className="truncate">No Answer Submitted</span>
                      </span>
                      <span className="font-mono shrink-0 whitespace-nowrap">
                        -1,000 PTS (Penalty)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] font-black flex items-center justify-between text-xs sm:text-sm gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <XCircle className="w-4 h-4 text-[#EF5350] shrink-0" />
                        <span className="truncate">Incorrect Answer</span>
                      </span>
                      <span className="font-mono shrink-0 whitespace-nowrap">
                        -{formatCurrency(snapshot.player?.lastSubmission?.betAmount || 0)}
                      </span>
                    </div>
                  )}
                    </div>
                  </div>

                  {snapshot.currentQuestion.explanation && (
                    <p className="text-[#6B6A78] border-t border-[#EAE7F2] pt-2.5 leading-relaxed font-medium">
                      <strong className="text-[#6C5CE7] font-bold">Explanation: </strong>
                      {snapshot.currentQuestion.explanation}
                    </p>
                  )}

                  {/* Review Countdown Indicator */}
                  <div className="pt-2.5 border-t border-[#EAE7F2] flex items-center justify-between text-xs text-[#FF7417] font-bold uppercase tracking-wider font-mono gap-2">
                    <span className="whitespace-nowrap flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-[#FF7417] shrink-0" />
                      <span>
                        {snapshot.currentQuestionIndex >= snapshot.totalQuestions
                          ? "Final results in"
                          : "Next round in"}
                      </span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFF3E8] border border-[#FFD9BE] shrink-0 whitespace-nowrap">
                      {secondsRemaining}s
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Controlled Betting Amount Box (Matching Screenshot 9) */}
            {isQuestionActive && !hasSubmitted && (
              <form
                onSubmit={handleBetSubmit}
                className="p-6 sm:p-7 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm space-y-5"
              >
                {realtimeError && (
                  <div className="p-3.5 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold">
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
                  className="w-full h-12 sm:h-14 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] disabled:opacity-40 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>PROCESSING...</span>
                    </span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>LOCK IN BET {formatCurrency(betAmount)}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Submitted Wait State (Matching Screenshots 10 & 11) */}
            {hasSubmitted && isQuestionActive && (
              <div className="p-5 sm:p-6 rounded-3xl bg-[#FFF8F2] border border-[#FFD9BE] text-center shadow-sm space-y-3 animate-fade-in flex flex-col items-center">
                <PlayerAvatar
                  avatarId={snapshot.player?.avatarId}
                  size="md"
                  glow
                  className="ring-2 ring-[#FF7417]"
                />
                <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#FFE8D6] text-[#FF7417] text-xs font-black font-mono">
                  <Lock className="w-3.5 h-3.5 text-[#FF7417] shrink-0" />
                  <span>Bet of {formatCurrency(snapshot.player?.lastSubmission?.betAmount || betAmount)} Locked</span>
                </div>
                <p className="text-xs text-[#6B6A78] font-medium max-w-sm">
                  Your answer is locked in. Balance will update after the countdown timer ends.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. GAME COMPLETED VIEW (Matching Screenshots 3 & 12) */}
        {isFinished && (
          <div className="space-y-4 sm:space-y-5 animate-fade-in">
            {/* Scoreboard Card */}
            <div className="p-5 sm:p-9 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm text-center">
              <div className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1 rounded-full bg-[#EAF9F2] border border-[#A7F3D0] text-[#22B978] text-[11px] sm:text-xs font-black uppercase tracking-wider mb-3">
                <CheckCircle2 className="w-4 h-4 text-[#22B978] shrink-0" />
                <span>GAME FINISHED</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-[#191820] uppercase tracking-tight">
                FINAL AUTHORITATIVE SCOREBOARD
              </h2>
              <p className="text-xs text-[#6B6A78] mt-1 font-medium">Quiz Completed</p>

              {snapshot.player && (
                <div className="mt-6 sm:mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 text-xs text-left">
                  {/* Tile 1: Starting Balance */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-[#6C5CE7]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[#6B6A78] block uppercase font-bold text-[10px] truncate">Starting Balance</span>
                      <strong className="text-[#191820] text-sm font-black font-mono truncate block">
                        {formatCurrency(snapshot.rules.startingBalance)}
                      </strong>
                    </div>
                  </div>

                  {/* Tile 2: Final Balance */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF3E8] text-[#FF7417] flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5 text-[#FF7417]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[#6B6A78] block uppercase font-bold text-[10px] truncate">Final Balance</span>
                      <strong className="text-[#FF7417] text-sm sm:text-base font-black font-mono truncate block">
                        {formatCurrency(snapshot.player.balance)}
                      </strong>
                    </div>
                  </div>

                  {/* Tile 3: Questions Answered */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                      <HelpCircle className="w-5 h-5 text-[#6C5CE7]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[#6B6A78] block uppercase font-bold text-[10px] truncate">Questions Answered</span>
                      <strong className="text-[#191820] text-sm font-black font-mono truncate block">
                        {snapshot.totalQuestions} Questions
                      </strong>
                    </div>
                  </div>

                  {/* Tile 4: Wins / Losses */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-[#6C5CE7]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[#6B6A78] block uppercase font-bold text-[10px] truncate">Wins / Losses</span>
                      <strong className="text-[#191820] text-sm font-mono truncate block">
                        <span className="text-[#22B978] font-black">{snapshot.player.totalWins ?? 0}W</span>
                        {" / "}
                        <span className="text-[#EF5350] font-black">{snapshot.player.totalLosses ?? 0}L</span>
                      </strong>
                    </div>
                  </div>

                  {/* Tile 5: Total Wagered */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-[#6C5CE7]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[#6B6A78] block uppercase font-bold text-[10px] truncate">Total Wagered</span>
                      <strong className="text-[#191820] text-sm font-black font-mono truncate block">
                        {formatCurrency(snapshot.player.totalWagered ?? 0)}
                      </strong>
                    </div>
                  </div>

                  {/* Tile 6: Net Result */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF9F2] text-[#22B978] flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-[#22B978]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[#6B6A78] block uppercase font-bold text-[10px] truncate">Net Result</span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                          (snapshot.player.netResult ?? 0) >= 0
                            ? "bg-[#EAF9F2] text-[#22B978]"
                            : "bg-[#FDEEEC] text-[#EF5350]"
                        }`}
                      >
                        {(snapshot.player.netResult ?? 0) >= 0
                          ? `+${formatCurrency(snapshot.player.netResult ?? 0)}`
                          : `-${formatCurrency(Math.abs(snapshot.player.netResult ?? 0))}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Final Standings Table (Matching Screenshot 12) */}
            {snapshot.leaderboard.length > 0 && (
              <div className="p-5 sm:p-7 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <Trophy className="w-5 h-5 text-[#FF7417] shrink-0" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#191820]">
                    FINAL LEADERBOARD
                  </h3>
                </div>

                <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                  <table className="w-full text-left text-xs min-w-[480px]">
                    <thead>
                      <tr className="bg-[#F0EEFF] text-[#6C5CE7] uppercase tracking-wider font-extrabold rounded-xl">
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-l-xl">RANK</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4">PLAYER</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4">BALANCE</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4">REFILLS</th>
                        <th className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-r-xl">NET SCORE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE7F2] font-semibold">
                      {snapshot.leaderboard.map((entry) => {
                        const isFirst = entry.rank === 1;
                        return (
                          <tr
                            key={entry.gamePlayerId}
                            className={`transition-colors ${
                              isFirst
                                ? "bg-[#FFF9E6] font-bold text-[#191820]"
                                : entry.isCurrentPlayer
                                ? "bg-[#F0EEFF] text-[#191820]"
                                : "text-[#191820] hover:bg-[#F7F6F2]"
                            }`}
                          >
                            <td className="py-3 px-3 sm:px-4 font-mono font-black">
                              {isFirst ? (
                                <span className="inline-flex items-center gap-1 text-[#FFB800]">
                                  <Crown className="w-3.5 h-3.5 text-[#FFB800] shrink-0" />
                                  <span>#1</span>
                                </span>
                              ) : (
                                <span className="text-[#6C5CE7]">#{entry.rank}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 sm:px-4 flex items-center gap-2 min-w-0">
                              <PlayerAvatar avatarId={entry.avatarId} size="sm" showCrown={isFirst} glow={isFirst} className="shrink-0" />
                              <span className="truncate">{entry.displayName}</span>
                            </td>
                            <td className="py-3 px-3 sm:px-4 font-mono text-[#FF7417] font-black whitespace-nowrap">
                              {formatCurrency(entry.balance)}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-[#6B6A78] font-mono whitespace-nowrap">{entry.refillCount}</td>
                            <td className="py-3 px-3 sm:px-4 font-mono font-black text-[#FF7417] whitespace-nowrap">
                              {formatCurrency(entry.netScore)}
                            </td>
                          </tr>
                        );
                      })}
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
