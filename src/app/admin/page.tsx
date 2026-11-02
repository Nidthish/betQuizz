"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPoints } from "@/lib/utils/format";

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
  const [startingBalance, setStartingBalance] = useState(10000);
  const [refillAmount, setRefillAmount] = useState(10000);
  const [refillFee, setRefillFee] = useState(1000);

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
          startingBalance,
          refillAmount,
          refillFee,
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
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center">
            Q
          </div>
          <span className="font-bold text-sm tracking-tight text-white">QUIZ BETTING HOST</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider transition-colors"
          >
            + Create Game
          </button>
          <button
            onClick={handleLogout}
            className="h-9 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Active Quiz Rooms</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Manage live games, questions, and player balances</p>
          </div>
          <button
            onClick={fetchGames}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-base font-bold text-white">No Active Games</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Create a new quiz room to generate an unguessable game PIN and configure questions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-lg text-xs font-black uppercase tracking-wider"
            >
              + Create First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((g) => {
              const isLive = g.status === "QUESTION_ACTIVE" || g.status === "FINAL_ROUND";
              return (
                <div
                  key={g.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    isLive
                      ? "bg-zinc-900 border-amber-400/80 shadow-md ring-1 ring-amber-400/30"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                        {g.code}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          isLive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : g.status === "LOBBY"
                            ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : g.status === "FINISHED"
                            ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            : "bg-zinc-800 text-amber-400"
                        }`}
                      >
                        {g.status.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate">{g.title}</h3>

                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Players</span>
                        <span className="font-bold font-mono text-zinc-200 mt-0.5 block">
                          {g.totalPlayers} Joined
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Rounds</span>
                        <span className="font-bold font-mono text-zinc-200 mt-0.5 block">
                          {g.currentQuestionIndex > 0 ? `${g.currentQuestionIndex} / ` : ""}
                          {g.totalQuestions} Questions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <Link
                      href={`/game/${g.code}`}
                      target="_blank"
                      className="text-zinc-400 hover:text-zinc-200 font-medium"
                    >
                      Player View ↗
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetGame(g.id, g.title)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-xs font-bold transition-colors"
                        title="Reset game players & scores (preserves questions)"
                      >
                        Reset
                      </button>
                      <Link
                        href={`/admin/game/${g.id}`}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs transition-colors"
                      >
                        Open Host Center →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Create New Quiz Room</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Game Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="e.g. Science Bowl Round 1"
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">
                    Start Bonus
                  </label>
                  <input
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(parseInt(e.target.value, 10))}
                    className="w-full h-9 px-2.5 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">
                    Refill Pts
                  </label>
                  <input
                    type="number"
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(parseInt(e.target.value, 10))}
                    className="w-full h-9 px-2.5 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">
                    Refill Fee
                  </label>
                  <input
                    type="number"
                    value={refillFee}
                    onChange={(e) => setRefillFee(parseInt(e.target.value, 10))}
                    className="w-full h-9 px-2.5 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider transition-colors"
                >
                  {creating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
