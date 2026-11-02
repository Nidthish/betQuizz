"use client";

import React from "react";
import Link from "next/link";
import { MultiGameDrawer } from "./MultiGameDrawer";

interface NavbarProps {
  currentGameCode?: string;
  gameTitle?: string;
  variant?: "player" | "host";
}

export const Navbar: React.FC<NavbarProps> = ({
  currentGameCode,
  gameTitle,
  variant = "player",
}) => {
  const isHost = variant === "host";

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors ${
        isHost
          ? "bg-[#6C5CE7] text-white shadow-md border-b border-[#5b4cdb]"
          : "bg-white/95 backdrop-blur-md text-[#191820] border-b border-[#EAE7F2] shadow-sm"
      }`}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 select-none group min-w-0 shrink">
          <div className="w-8 h-8 rounded-lg bg-[#FFB800] text-[#191820] font-black text-base flex items-center justify-center tracking-tighter shadow-sm group-hover:scale-105 transition-transform shrink-0">
            Q
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className={`font-black text-xs sm:text-base tracking-tight truncate ${
                isHost ? "text-white" : "text-[#191820] group-hover:text-[#6C5CE7]"
              }`}
            >
              {isHost ? "QUIZBET HOST" : "QUIZ BETTING"}
            </span>
            {gameTitle && (
              <span
                className={`text-[10px] sm:text-[11px] truncate max-w-[120px] sm:max-w-xs font-medium leading-tight ${
                  isHost ? "text-purple-200" : "text-[#6B6A78]"
                }`}
              >
                {gameTitle}
              </span>
            )}
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {currentGameCode && (
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold border whitespace-nowrap shrink-0 ${
                isHost
                  ? "bg-white/15 text-white border-white/20"
                  : "bg-[#F0EEFF] text-[#6C5CE7] border-[#DDD6FE]"
              }`}
            >
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-75 hidden xs:inline sm:inline">
                ROOM
              </span>
              <span className="tracking-wider">{currentGameCode}</span>
            </div>
          )}

          <MultiGameDrawer currentGameCode={currentGameCode} />
        </div>
      </div>
    </header>
  );
};
