"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatPoints } from "@/lib/utils/format";
import { X, Gamepad2, ArrowRight, Plus } from "lucide-react";

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
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#F0EEFF] hover:bg-[#E9E5FF] border border-[#DDD6FE] text-xs font-bold text-[#6C5CE7] transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
        title="Active Rooms"
      >
        <span className="w-2 h-2 rounded-full bg-[#22B978] shadow-sm animate-pulse shrink-0" />
        <span className="whitespace-nowrap">My Rooms</span>
        {games.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 bg-[#6C5CE7] text-white text-[10px] rounded-full font-bold">
            {games.length}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#191820]/60 backdrop-blur-sm z-50 flex justify-end transition-opacity animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white border-l border-[#EAE7F2] h-full p-5 sm:p-6 flex flex-col shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE7F2]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#191820]">Your Active Games</h3>
                <p className="text-xs text-[#6B6A78] mt-0.5">Switch rooms without losing your balance</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] flex items-center justify-center transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#6C5CE7] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] my-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#E9E5FF] text-[#6C5CE7] flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Gamepad2 className="w-6 h-6 text-[#6C5CE7]" />
                </div>
                <p className="text-sm text-[#191820] font-bold">No Other Active Rooms</p>
                <p className="text-xs text-[#6B6A78] mt-1 leading-relaxed">Join another room code to compete across multiple quizzes.</p>
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF7417] hover:bg-[#e6640e] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  <span>Join New Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3 flex-1 mt-4">
                {games.map((g) => {
                  const isCurrent = g.gameCode === currentGameCode;
                  return (
                    <Link
                      key={g.gameId}
                      href={`/game/${g.gameCode}`}
                      onClick={() => setIsOpen(false)}
                      className={`block p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-[#F7F6F2] border-[#6C5CE7] shadow-sm ring-1 ring-[#6C5CE7]"
                          : "bg-white hover:bg-[#F7F6F2] border-[#EAE7F2]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-[#FF7417] text-sm tracking-wider">
                          {g.gameCode}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            g.status === "QUESTION_ACTIVE" || g.status === "FINAL_ROUND"
                              ? "bg-[#EAF9F2] text-[#22B978] border border-[#A7F3D0]"
                              : g.status === "LOBBY"
                              ? "bg-[#E9E5FF] text-[#6C5CE7] border border-[#C4B5FD]"
                              : g.status === "FINISHED"
                              ? "bg-[#F0EEFF] text-[#6B6A78] border border-[#EAE7F2]"
                              : "bg-[#FFF3E8] text-[#FF7417]"
                          }`}
                        >
                          {g.status.replace("_", " ")}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-[#191820] mt-2 truncate">{g.title}</p>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#EAE7F2] text-xs">
                        <span className="text-[#6B6A78]">
                          Points: <strong className="text-[#191820] font-mono">₹{formatPoints(g.balance)}</strong>
                        </span>
                        <span className="text-[#6C5CE7] font-bold inline-flex items-center gap-1">
                          {isCurrent ? (
                            "Current Room"
                          ) : (
                            <>
                              <span>Switch</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-[#EAE7F2] mt-auto">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="w-full py-3 rounded-xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Join Another Room</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
