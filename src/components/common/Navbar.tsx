"use client";

import React from "react";
import Link from "next/link";
import { MultiGameDrawer } from "./MultiGameDrawer";

interface NavbarProps {
  currentGameCode?: string;
  gameTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentGameCode, gameTitle }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo - Crisp, clean, authentic */}
        <Link href="/" className="flex items-center gap-2.5 select-none group">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-zinc-950 font-black text-sm flex items-center justify-center tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
            Q
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base tracking-tight text-zinc-100 group-hover:text-amber-400 transition-colors">
                QUIZ BETTING
              </span>
            </div>
            {gameTitle && (
              <span className="text-[10px] text-zinc-400 truncate max-w-[140px] sm:max-w-xs font-medium">
                {gameTitle}
              </span>
            )}
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {currentGameCode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700/80 text-xs font-mono">
              <span className="text-zinc-400 hidden sm:inline text-[11px]">ROOM</span>
              <span className="font-bold text-amber-400 tracking-wider">
                {currentGameCode}
              </span>
            </div>
          )}

          <MultiGameDrawer currentGameCode={currentGameCode} />
        </div>
      </div>
    </header>
  );
};
