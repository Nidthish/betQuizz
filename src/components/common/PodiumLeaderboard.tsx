"use client";

import React, { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/lib/types/game";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { formatCurrency, formatPoints } from "@/lib/utils/format";
import { triggerWinConfetti } from "@/lib/utils/confetti";
import {
  Trophy,
  Crown,
  Medal,
  Star,
  Sparkles,
  ArrowLeft,
  Flame,
  CheckCircle2,
  XCircle,
  Percent,
} from "lucide-react";

interface PodiumLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentPlayerId?: string;
  title?: string;
  onViewStats?: () => void;
  showBackToStats?: boolean;
  disableConfetti?: boolean;
}

export function PodiumLeaderboard({
  leaderboard,
  currentPlayerId,
  title = "Final Results",
  onViewStats,
  showBackToStats = false,
  disableConfetti = false,
}: PodiumLeaderboardProps) {
  const [showAllInTable, setShowAllInTable] = useState(false);

  // Trigger celebratory confetti on initial mount of the podium
  useEffect(() => {
    if (disableConfetti) return;
    try {
      triggerWinConfetti();
    } catch {
      // safe fallback
    }
  }, [disableConfetti]);

  // Top 3 players for podium
  const firstPlace = leaderboard.find((p) => p.rank === 1);
  const secondPlace = leaderboard.find((p) => p.rank === 2);
  const thirdPlace = leaderboard.find((p) => p.rank === 3);

  // Remaining players for the table below (Rank 4+)
  const remainingPlayers = leaderboard.filter((p) => p.rank > 3);
  const displayedTablePlayers = showAllInTable ? leaderboard : remainingPlayers;

  // Find if current player is outside the top 3
  const currentPlayer = leaderboard.find(
    (p) => p.isCurrentPlayer || p.gamePlayerId === currentPlayerId
  );
  const isCurrentPlayerInTop3 = currentPlayer ? currentPlayer.rank <= 3 : false;

  // Helper to compute accuracy percentage
  const getAccuracy = (correct: number, wrong: number) => {
    const total = correct + wrong;
    if (total <= 0) return 0;
    return Math.round((correct / total) * 100);
  };

  return (
    <div className="relative w-full max-w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#2D1B69] via-[#1F1449] to-[#120B2E] text-white p-3 sm:p-7 md:p-8 shadow-2xl border border-white/10 space-y-5 sm:space-y-8 animate-fade-in">
      {/* Ambient background glow & radial burst */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#6C5CE7]/30 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#FF7417]/15 blur-[100px] rounded-full" />

      {/* Floating Confetti Accents (Pure CSS decorative) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <span className="absolute top-6 left-8 w-2.5 h-6 bg-[#FFC72C] rounded-sm rotate-12 animate-pulse" />
        <span className="absolute top-12 left-1/4 w-3 h-3 bg-[#00D2FF] rounded-full rotate-45" />
        <span className="absolute top-8 right-12 w-2.5 h-5 bg-[#FF6584] rounded-sm -rotate-45" />
        <span className="absolute top-20 right-1/4 w-3.5 h-3.5 bg-[#22B978] rounded-full rotate-12" />
        <span className="absolute top-36 left-12 w-2 h-4 bg-[#FF7417] rounded-sm rotate-45" />
        <span className="absolute top-48 right-8 w-3 h-3 bg-[#E9E5FF] rounded-full" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-4">
        {showBackToStats && onViewStats ? (
          <button
            onClick={onViewStats}
            type="button"
            className="order-2 sm:order-1 h-9 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Statistics</span>
          </button>
        ) : (
          <div className="order-2 sm:order-1 hidden sm:block w-24" />
        )}

        <div className="order-1 sm:order-2 inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#181136]/90 border border-white/15 shadow-inner">
          <Sparkles className="w-4 h-4 text-[#FFC72C] animate-spin" />
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#E9E5FF]">
            {title}
          </h2>
          <Sparkles className="w-4 h-4 text-[#FFC72C] animate-spin" />
        </div>

        <div className="order-3 flex items-center gap-2">
          {remainingPlayers.length > 0 && (
            <button
              onClick={() => setShowAllInTable((prev) => !prev)}
              type="button"
              className="text-[11px] font-bold text-[#A78BFA] hover:text-white underline underline-offset-4 transition-colors"
            >
              {showAllInTable ? "Show Remaining Only" : "Show All in Table"}
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3D PODIUM SECTION */}
      {/* Order from left to right: 2nd Place, 1st Place, 3rd Place */}
      {/* ============================================================== */}
      <div className="relative z-10 pt-6 sm:pt-12 pb-2">
        <div className="max-w-xl mx-auto flex items-end justify-center gap-1.5 sm:gap-4 md:gap-6 px-1 sm:px-2 min-h-[300px] sm:min-h-[400px]">
          {/* ==================== 2ND PLACE (CYAN / BLUE) ==================== */}
          <div className="w-1/3 max-w-[115px] sm:max-w-[160px] md:max-w-[180px] flex flex-col items-center min-w-0">
            {secondPlace ? (
              <div className="w-full flex flex-col items-center">
                {/* Name Pill */}
                <div className="mb-1.5 sm:mb-2 max-w-full px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/95 text-[#0A2540] text-[10px] sm:text-xs font-black truncate shadow-lg border border-[#00D2FF]/40">
                  {secondPlace.displayName}
                </div>

                {/* Avatar with Silver Ring & Rank Badge */}
                <div className="relative mb-1.5 sm:mb-2">
                  <div className="relative rounded-full p-1 bg-gradient-to-tr from-[#00D2FF] to-[#0077FE] shadow-[0_0_16px_rgba(0,210,255,0.4)]">
                    <PlayerAvatar
                      avatarId={secondPlace.avatarId}
                      size="lg"
                      className="w-11 h-11 sm:w-16 sm:h-16 rounded-full border-2 border-white bg-[#0A2540]"
                    />
                  </div>
                  {/* Silver Medal Badge */}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#E2E8F0] to-[#94A3B8] text-[#1E293B] font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md border-2 border-white">
                    2
                  </span>
                  {secondPlace.isCurrentPlayer && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-[#FF7417] text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow">
                      YOU
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="mb-1.5 sm:mb-2 text-center">
                  <span className="text-[11px] sm:text-sm font-black font-mono text-[#00D2FF] drop-shadow">
                    {formatCurrency(secondPlace.balance)}
                  </span>
                </div>

                {/* 2nd Place Pedestal Pillar */}
                <div className="w-full h-28 sm:h-44 md:h-52 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-[#00D2FF] via-[#00A3FF] to-[#0055D4] shadow-[0_10px_30px_rgba(0,163,255,0.35)] flex flex-col items-center justify-start pt-2 sm:pt-3 border-t-2 border-x border-white/40 relative overflow-hidden">
                  {/* Subtle pillar bevel highlight */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-white/60" />
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black text-white/30 font-mono select-none">
                    2
                  </span>
                  <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-white/80 mt-auto pb-2 sm:pb-3 font-mono">
                    2ND
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-20 rounded-t-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs">
                Empty
              </div>
            )}
          </div>

          {/* ==================== 1ST PLACE (GOLD / CHAMPION) ==================== */}
          <div className="w-1/3 max-w-[130px] sm:max-w-[185px] md:max-w-[210px] flex flex-col items-center min-w-0 z-20">
            {firstPlace ? (
              <div className="w-full flex flex-col items-center">
                {/* Crown Banner / Burst */}
                <div className="relative flex items-center justify-center mb-0.5 sm:mb-1">
                  <Crown className="w-6 h-6 sm:w-10 sm:h-10 text-[#FFC72C] drop-shadow-[0_0_12px_rgba(255,199,44,0.8)] animate-bounce" />
                </div>

                {/* Name Pill with Gold Accent */}
                <div className="mb-1.5 sm:mb-2 max-w-full px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#FFC72C] text-[#3D2500] text-[11px] sm:text-sm font-black truncate shadow-xl border-2 border-white">
                  {firstPlace.displayName}
                </div>

                {/* Avatar with Gold Ring & Burst */}
                <div className="relative mb-1.5 sm:mb-2">
                  <div className="relative rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-[#FFE066] via-[#FFC72C] to-[#FF8C00] shadow-[0_0_24px_rgba(255,199,44,0.65)]">
                    <PlayerAvatar
                      avatarId={firstPlace.avatarId}
                      size="xl"
                      className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-white bg-[#2A1B00]"
                      glow
                    />
                  </div>
                  {/* Gold Medal Badge */}
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[#FFE066] to-[#E59400] text-[#3D2500] font-black text-xs sm:text-sm flex items-center justify-center shadow-lg border-2 border-white">
                    1
                  </span>
                  {firstPlace.isCurrentPlayer && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#FF7417] text-white text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg ring-1 ring-white">
                      YOU
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="mb-1.5 sm:mb-2 text-center">
                  <span className="text-xs sm:text-base font-black font-mono text-[#FFC72C] drop-shadow-[0_0_8px_rgba(255,199,44,0.5)]">
                    {formatCurrency(firstPlace.balance)}
                  </span>
                </div>

                {/* 1st Place Pedestal Pillar (Tallest) */}
                <div className="w-full h-36 sm:h-56 md:h-64 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-[#FFD036] via-[#FFAE00] to-[#E07B00] shadow-[0_12px_40px_rgba(255,174,0,0.45)] flex flex-col items-center justify-start pt-2 sm:pt-4 border-t-2 border-x border-white/60 relative overflow-hidden">
                  {/* Glowing Top Bevel */}
                  <div className="absolute inset-x-0 top-0 h-1 sm:h-1.5 bg-white/80" />
                  <span className="text-5xl sm:text-7xl md:text-8xl font-black text-amber-950/25 font-mono select-none">
                    1
                  </span>
                  <div className="mt-auto pb-2 sm:pb-4 flex items-center gap-1 text-[#3D2500] text-[9px] sm:text-xs font-black uppercase tracking-widest font-mono">
                    <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3D2500]" />
                    <span>CHAMPION</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-24 rounded-t-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs">
                No Winner
              </div>
            )}
          </div>

          {/* ==================== 3RD PLACE (PINK / BRONZE) ==================== */}
          <div className="w-1/3 max-w-[115px] sm:max-w-[160px] md:max-w-[180px] flex flex-col items-center min-w-0">
            {thirdPlace ? (
              <div className="w-full flex flex-col items-center">
                {/* Name Pill */}
                <div className="mb-1.5 sm:mb-2 max-w-full px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/95 text-[#2A0515] text-[10px] sm:text-xs font-black truncate shadow-lg border border-[#FF6584]/40">
                  {thirdPlace.displayName}
                </div>

                {/* Avatar with Pink / Rose Ring & Rank Badge */}
                <div className="relative mb-1.5 sm:mb-2">
                  <div className="relative rounded-full p-1 bg-gradient-to-tr from-[#FF6584] to-[#E02462] shadow-[0_0_16px_rgba(255,101,132,0.4)]">
                    <PlayerAvatar
                      avatarId={thirdPlace.avatarId}
                      size="lg"
                      className="w-11 h-11 sm:w-16 sm:h-16 rounded-full border-2 border-white bg-[#2A0515]"
                    />
                  </div>
                  {/* Bronze Medal Badge */}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#FDBA74] to-[#C2410C] text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md border-2 border-white">
                    3
                  </span>
                  {thirdPlace.isCurrentPlayer && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-[#FF7417] text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow">
                      YOU
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="mb-1.5 sm:mb-2 text-center">
                  <span className="text-[11px] sm:text-sm font-black font-mono text-[#FF85A0] drop-shadow">
                    {formatCurrency(thirdPlace.balance)}
                  </span>
                </div>

                {/* 3rd Place Pedestal Pillar (Shortest) */}
                <div className="w-full h-20 sm:h-36 md:h-44 rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-[#FF6584] via-[#F43F5E] to-[#C01548] shadow-[0_10px_30px_rgba(244,63,94,0.35)] flex flex-col items-center justify-start pt-2 sm:pt-3 border-t-2 border-x border-white/40 relative overflow-hidden">
                  {/* Subtle bevel highlight */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-white/60" />
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black text-white/30 font-mono select-none">
                    3
                  </span>
                  <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-white/80 mt-auto pb-2 sm:pb-3 font-mono">
                    3RD
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-16 rounded-t-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs">
                Empty
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE HIGHLIGHT BAR FOR CURRENT PLAYER (IF OUTSIDE TOP 3) */}
      {/* Matches Reference Screenshot 2 */}
      {/* ============================================================== */}
      {currentPlayer && !isCurrentPlayerInTop3 && (
        <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-white text-[#191820] shadow-xl border-2 border-[#6C5CE7] flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] font-mono font-black text-xs flex items-center justify-center shrink-0">
              #{currentPlayer.rank}
            </span>
            <PlayerAvatar avatarId={currentPlayer.avatarId} size="sm" className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm truncate">{currentPlayer.displayName}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#6C5CE7] text-white text-[9px] font-black uppercase tracking-wider">
                  YOU
                </span>
              </div>
              <span className="text-[10px] text-[#6B6A78] font-bold">
                {currentPlayer.totalCorrect} Correct • {currentPlayer.totalWrong} Wrong
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm sm:text-base font-black font-mono text-[#FF7417] block">
              {formatCurrency(currentPlayer.balance)}
            </span>
            <span className="text-[10px] font-bold text-[#22B978]">
              {getAccuracy(currentPlayer.totalCorrect, currentPlayer.totalWrong)}% Acc
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LEADERBOARD TABLE BELOW PODIUM (REMAINING PLAYERS: RANK 4+) */}
      {/* Matches Reference Screenshot 1 */}
      {/* ============================================================== */}
      <div className="relative z-10 w-full max-w-full rounded-2xl bg-[#1A1238]/90 backdrop-blur-md border border-white/10 p-3.5 sm:p-6 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFC72C]" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {showAllInTable
                ? `ALL STANDINGS (${leaderboard.length})`
                : `REMAINING SQUAD (${remainingPlayers.length})`}
            </h3>
          </div>
          <span className="text-[10px] sm:text-xs text-white/50 font-bold">
            Ranked by Net Balance
          </span>
        </div>

        {displayedTablePlayers.length === 0 ? (
          <div className="py-8 text-center text-white/60 text-xs sm:text-sm">
            <Sparkles className="w-6 h-6 text-[#FFC72C] mx-auto mb-2 opacity-80" />
            <p className="font-bold">All players have claimed a spot on the podium!</p>
            <p className="text-[11px] text-white/40 mt-1">Outstanding game by everyone.</p>
          </div>
        ) : (
          <div className="w-full max-w-full overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-0">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead>
                <tr className="bg-white/10 text-[#E9E5FF] uppercase tracking-wider font-extrabold text-[10px] sm:text-xs rounded-xl">
                  <th className="py-3 px-3.5 rounded-l-xl">RANK</th>
                  <th className="py-3 px-3.5">PLAYER</th>
                  <th className="py-3 px-3.5 text-right">SCORE</th>
                  <th className="py-3 px-3.5 text-center">CORRECT</th>
                  <th className="py-3 px-3.5 text-center">INCORRECT</th>
                  <th className="py-3 px-3.5 text-right rounded-r-xl">ACCURACY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-semibold">
                {displayedTablePlayers.map((entry) => {
                  const isUser =
                    entry.isCurrentPlayer || entry.gamePlayerId === currentPlayerId;
                  const accuracy = getAccuracy(entry.totalCorrect, entry.totalWrong);

                  return (
                    <tr
                      key={entry.gamePlayerId}
                      className={`transition-colors ${
                        isUser
                          ? "bg-[#6C5CE7]/35 text-white font-bold border-l-4 border-l-[#FF7417]"
                          : entry.rank <= 3
                          ? "bg-white/5 text-white/95"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3 px-3.5 font-mono font-black">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center gap-1 text-[#FFC72C]">
                            <Star className="w-3.5 h-3.5 fill-[#FFC72C] text-[#FFC72C]" />
                            <span>1</span>
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center gap-1 text-[#00D2FF]">
                            <Medal className="w-3.5 h-3.5 text-[#00D2FF]" />
                            <span>2</span>
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center gap-1 text-[#FF85A0]">
                            <Medal className="w-3.5 h-3.5 text-[#FF85A0]" />
                            <span>3</span>
                          </span>
                        ) : (
                          <span className="text-white/60">#{entry.rank}</span>
                        )}
                      </td>

                      {/* Player Column (Avatar + Display Name) */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            avatarId={entry.avatarId}
                            size="sm"
                            className="shrink-0"
                          />
                          <span className="truncate text-white font-bold">
                            {entry.displayName}
                          </span>
                          {isUser && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-[#FF7417] text-white text-[9px] font-black uppercase tracking-wider">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Final Balance / Score */}
                      <td className="py-3 px-3.5 text-right font-mono font-black text-[#FFC72C] text-sm whitespace-nowrap">
                        {formatCurrency(entry.balance)}
                      </td>

                      {/* Correct Answers */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1 text-[#22B978] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#22B978]" />
                          <span>{entry.totalCorrect}</span>
                        </span>
                      </td>

                      {/* Incorrect Answers */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1 text-[#EF5350] font-bold">
                          <XCircle className="w-3 h-3 text-[#EF5350]" />
                          <span>{entry.totalWrong}</span>
                        </span>
                      </td>

                      {/* Overall Accuracy */}
                      <td className="py-3 px-3.5 text-right font-mono font-black text-white whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            accuracy >= 70
                              ? "bg-[#22B978]/20 text-[#22B978]"
                              : accuracy >= 40
                              ? "bg-[#FFC72C]/20 text-[#FFC72C]"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {accuracy}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
