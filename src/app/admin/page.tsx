"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPoints } from "@/lib/utils/format";
import {
  Plus,
  LogOut,
  RotateCw,
  RotateCcw,
  Gamepad2,
  Users,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Layers,
  X,
} from "lucide-react";

interface AdminGameItem {
  id: string;
  code: string;
  title: string;
  status: string;
  startingBalance: number;
  refillAmount: number;
  refillFee: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  totalPlayers: number;
  activePlayers: number;
  createdAt: string;
}

export default function AdminMultiGameDashboard() {
  const router = useRouter();
  const [games, setGames] = useState<AdminGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [startingBalance, setStartingBalance] = useState<number | string>(10000);
  const [refillAmount, setRefillAmount] = useState<number | string>(10000);
  const [refillFee, setRefillFee] = useState<number | string>(1000);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/admin/games");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGames(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleResetGame = async (gameId: string, title: string) => {
    const ok = window.confirm(
      `Are you sure you want to reset "${title}"?\n\n• All players and scores will be removed.\n• ALL questions will be preserved.\n• The game will return to Lobby.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/games/${gameId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_GAME" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchGames();
      } else {
        alert(data.message || "Failed to reset game");
      }
    } catch {
      alert("Network error resetting game");
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          startingBalance: Number(startingBalance) || 10000,
          refillAmount: Number(refillAmount) || 10000,
          refillFee: Number(refillFee) || 0,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setShowCreateModal(false);
        setNewTitle("");
        await fetchGames();
        router.push(`/admin/game/${data.data.id}`);
      }
    } catch {
      // Ignore
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
      {/* Top Banner Navbar in Deep Purple */}
      <header className="bg-[#6C5CE7] text-white px-4 sm:px-6 h-16 flex items-center justify-between shadow-md gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FFB800] text-[#191820] font-black text-base flex items-center justify-center tracking-tighter shadow-sm shrink-0">
            Q
          </div>
          <span className="font-black text-sm sm:text-lg tracking-tight text-white truncate">
            QUIZBET HOST
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Create Game</span>
            <span className="xs:hidden sm:hidden">Create</span>
          </button>
          <button
            onClick={handleLogout}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border border-white/25 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[#EAE7F2] mb-6 sm:mb-7 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#191820] tracking-tight">Active Quiz Rooms</h1>
            <p className="text-xs text-[#6B6A78] mt-0.5 sm:mt-1 font-medium">Manage live games, questions, and player balances</p>
          </div>
          <button
            onClick={fetchGames}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold border border-[#DDD6FE] transition-all shadow-sm active:scale-95 shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#6C5CE7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 sm:py-20 px-6 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#E9E5FF] text-[#6C5CE7] flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Gamepad2 className="w-8 h-8 text-[#6C5CE7]" />
            </div>
            <h3 className="text-lg font-black text-[#191820]">No Active Games</h3>
            <p className="text-xs text-[#6B6A78] mt-1.5 mb-6 leading-relaxed">
              Create a new quiz room to generate an unguessable game PIN and configure questions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-5 py-3 bg-[#FF7417] hover:bg-[#e6640e] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Room</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {games.map((g) => {
              const isLive = g.status === "QUESTION_ACTIVE" || g.status === "FINAL_ROUND";
              return (
                <div
                  key={g.id}
                  className="bg-white border border-[#EAE7F2] rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row: Room Code & Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-lg sm:text-xl font-black text-[#FF7417] tracking-wider">
                        {g.code}
                      </span>
                      <span
                        className={`text-xs font-black px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap ${
                          isLive
                            ? "bg-[#EAF9F2] text-[#22B978] border border-[#A7F3D0]"
                            : g.status === "LOBBY"
                            ? "bg-[#F0EEFF] text-[#6C5CE7] border border-[#DDD6FE]"
                            : g.status === "FINISHED"
                            ? "bg-[#F7F6F2] text-[#6B6A78] border border-[#EAE7F2]"
                            : "bg-[#FFF3E8] text-[#FF7417] border border-[#FFD9BE]"
                        }`}
                      >
                        <Users className="w-3 h-3 shrink-0" />
                        <span>{g.status.replace("_", " ")}</span>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-[#191820] truncate mb-4">{g.title}</h3>

                    {/* Dual Stats Boxes */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs mb-5">
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2]">
                        <span className="text-[#6B6A78] block text-[10px] sm:text-[11px] uppercase font-bold flex items-center gap-1.5 truncate">
                          <Users className="w-3 h-3 text-[#6C5CE7] shrink-0" />
                          <span>PLAYERS</span>
                        </span>
                        <span className="font-black text-[#191820] text-xs sm:text-sm mt-1 block truncate">
                          {g.totalPlayers} Joined
                        </span>
                      </div>
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2]">
                        <span className="text-[#6B6A78] block text-[10px] sm:text-[11px] uppercase font-bold flex items-center gap-1.5 truncate">
                          <HelpCircle className="w-3 h-3 text-[#6C5CE7] shrink-0" />
                          <span>ROUNDS</span>
                        </span>
                        <span className="font-black text-[#191820] text-xs sm:text-sm mt-1 block truncate">
                          {g.currentQuestionIndex > 0 ? `${g.currentQuestionIndex} / ` : ""}
                          {g.totalQuestions} Questions
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-[#EAE7F2] flex items-center justify-between text-xs gap-2">
                    <Link
                      href={`/game/${g.code}`}
                      target="_blank"
                      className="text-[#6C5CE7] hover:underline font-bold flex items-center gap-1 truncate"
                    >
                      <span>Player View</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResetGame(g.id, g.title)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#FDEEEC] hover:bg-[#FCA5A5]/30 border border-[#FCA5A5] text-[#EF5350] text-xs font-bold transition-colors flex items-center gap-1"
                        title="Reset game players & scores (preserves questions)"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                      <Link
                        href={`/admin/game/${g.id}`}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5b4cdb] text-white font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>Host Center</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Game Modal (Matching Screenshot 13) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191820]/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EAE7F2] p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE7F2] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shadow-sm shrink-0">
                  <Layers className="w-5 h-5 text-[#6C5CE7]" />
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#191820]">
                  CREATE NEW QUIZ ROOM
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] hover:bg-[#E9E5FF] flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#191820] mb-2 uppercase tracking-wider">
                  GAME TITLE
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="e.g. Cricket Championship"
                  className="w-full h-12 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-sm font-bold text-[#191820] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 outline-none transition-all placeholder:text-[#A09EB1]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#191820] mb-1.5 uppercase tracking-wider">
                    START BONUS
                  </label>
                  <input
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] font-mono text-sm font-black text-[#FF7417] outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#191820] mb-1.5 uppercase tracking-wider">
                    REFILL PTS
                  </label>
                  <input
                    type="number"
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] font-mono text-sm font-black text-[#FF7417] outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#191820] mb-1.5 uppercase tracking-wider">
                    REFILL FEE
                  </label>
                  <input
                    type="number"
                    value={refillFee}
                    onChange={(e) => setRefillFee(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] font-mono text-sm font-black text-[#FF7417] outline-none text-center"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-12 rounded-2xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-12 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "CREATE ROOM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
