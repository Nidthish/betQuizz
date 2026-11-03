"use client";

import React, { useState } from "react";
import { getMascot, Mascot } from "@/lib/constants/mascots";
import { Crown } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "preview";
export type AvatarAnimation = "none" | "float" | "bounce" | "shake" | "celebrate";

interface PlayerAvatarProps {
  avatarId?: string | null;
  size?: AvatarSize;
  animation?: AvatarAnimation;
  showCrown?: boolean;
  glow?: boolean;
  selected?: boolean;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

const sizeConfig: Record<
  AvatarSize,
  {
    boxClass: string;
    dimension: number;
    badgeTextSize: string;
    crownClass: string;
  }
> = {
  xs: {
    boxClass: "w-6 h-6 rounded-lg",
    dimension: 24,
    badgeTextSize: "text-[10px]",
    crownClass: "-top-2 -right-1 w-3 h-3",
  },
  sm: {
    boxClass: "w-8 h-8 rounded-xl",
    dimension: 32,
    badgeTextSize: "text-xs",
    crownClass: "-top-2.5 -right-1.5 w-3.5 h-3.5",
  },
  md: {
    boxClass: "w-10 h-10 rounded-2xl",
    dimension: 40,
    badgeTextSize: "text-sm",
    crownClass: "-top-3 -right-2 w-4 h-4",
  },
  lg: {
    boxClass: "w-14 h-14 rounded-2xl",
    dimension: 56,
    badgeTextSize: "text-base",
    crownClass: "-top-3.5 -right-2.5 w-5 h-5",
  },
  xl: {
    boxClass: "w-20 h-20 rounded-3xl",
    dimension: 80,
    badgeTextSize: "text-xl",
    crownClass: "-top-4 -right-3 w-6 h-6",
  },
  preview: {
    boxClass: "w-full max-w-[200px] sm:max-w-[240px] md:max-w-[260px] aspect-square rounded-3xl",
    dimension: 260,
    badgeTextSize: "text-4xl",
    crownClass: "-top-5 -right-4 w-8 h-8",
  },
};

const animationClasses: Record<AvatarAnimation, string> = {
  none: "",
  float: "animate-avatar-float",
  bounce: "animate-avatar-bounce",
  shake: "animate-avatar-shake",
  celebrate: "animate-avatar-celebrate",
};

export function PlayerAvatar({
  avatarId,
  size = "md",
  animation = "none",
  showCrown = false,
  glow = false,
  selected = false,
  className = "",
  alt,
  onClick,
}: PlayerAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const mascot: Mascot = getMascot(avatarId);
  const config = sizeConfig[size] || sizeConfig.md;

  const animClass = animationClasses[animation] || "";
  const selectionClass = selected
    ? "ring-4 ring-[#6C5CE7] shadow-[0_0_16px_rgba(108,92,231,0.55)] scale-105"
    : glow
    ? "shadow-[0_0_12px_rgba(108,92,231,0.35)]"
    : "";

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 select-none ${
        config.boxClass
      } ${animClass} ${selectionClass} ${className} ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      }`}
      style={{
        backgroundColor: size === "preview" ? "transparent" : mascot.badgeBg,
      }}
      title={alt || mascot.name}
    >
      {/* Fallback stylized badge if image fails or before load */}
      {hasError ? (
        <div
          className="w-full h-full rounded-[inherit] flex items-center justify-center font-black font-mono border border-black/5"
          style={{
            backgroundColor: mascot.badgeBg,
            color: mascot.accentColor,
          }}
        >
          <span className={config.badgeTextSize}>
            {mascot.name.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <img
          src={mascot.imagePath}
          alt={alt || mascot.name}
          width={config.dimension}
          height={config.dimension}
          onError={() => setHasError(true)}
          className={`w-full h-full object-contain pointer-events-none drop-shadow-md transition-transform duration-200 ${
            size === "preview" ? "p-1" : "p-0.5 rounded-[inherit]"
          }`}
          loading="lazy"
        />
      )}

      {/* Winner Crown Badge */}
      {showCrown && (
        <div
          className={`absolute ${config.crownClass} bg-[#FFB800] text-white p-0.5 rounded-full shadow-md flex items-center justify-center border-2 border-white animate-bounce-slight z-10`}
          title="Round Leader / Winner"
        >
          <Crown className="w-full h-full text-white fill-current" />
        </div>
      )}
    </div>
  );
}

export default PlayerAvatar;
