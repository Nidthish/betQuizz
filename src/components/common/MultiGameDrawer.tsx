"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatPoints } from "@/lib/utils/format";

interface JoinedGame {
  gamePlayerId: string;
  gameId: string;
  gameCode: string;
  title: string;
  status: string;
  balance: number;
  refillCount: number;
  currentQuestionIndex: number;
}

interface MultiGameDrawerProps {
  currentGameCode?: string;
}

export const MultiGameDrawer: React.FC<MultiGameDrawerProps> = ({ currentGameCode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [games, setGames] = useState<JoinedGame[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJoinedGames = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/player/games");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setGames(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchJoinedGames();
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-200 transition-colors shadow-sm"
        title="Active Rooms"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>My Rooms</span>
        {games.length > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-zinc-700 text-zinc-200 text-[10px] rounded-full font-bold">
            {games.length}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-950 border-l border-zinc-800 h-full p-5 flex flex-col shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Your Active Games</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Switch rooms without losing your balance</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl bg-zinc-900/50 border border-zinc-800 my-auto">
                <p className="text-xs text-zinc-300 font-semibold">No Other Active Rooms</p>
                <p className="text-[11px] text-zinc-500 mt-1">Join another room code to compete across multiple quizzes.</p>
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 inline-block px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-lg text-xs font-bold transition-colors"
                >
                  Join New Room
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 mt-4">
                {games.map((g) => {
                  const isCurrent = g.gameCode === currentGameCode;
                  return (
                    <Link
                      key={g.gameId}
                      href={`/game/${g.gameCode}`}
                      onClick={() => setIsOpen(false)}
                      className={`block p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-zinc-900 border-amber-400/80 shadow-md ring-1 ring-amber-400/40"
                          : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                          {g.gameCode}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            g.status === "QUESTION_ACTIVE" || g.status === "FINAL_ROUND"
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

                      <p className="text-xs font-semibold text-zinc-200 mt-1.5 truncate">{g.title}</p>

                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                        <span className="text-zinc-400 text-[11px]">
                          Points: <strong className="text-zinc-100 font-mono">{formatPoints(g.balance)}</strong>
                        </span>
                        <span className="text-amber-400 text-[11px] font-bold">
                          {isCurrent ? "Current Room" : "Switch →"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800 mt-auto">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
              >
                + Join Another Code
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
