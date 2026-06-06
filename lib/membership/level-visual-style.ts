import type { CSSProperties } from "react";
import {
  type MembershipLevel,
  normalizeMembershipLevel,
} from "@/lib/membership/points-engine";
import { cn } from "@/lib/utils";

export type MembershipLevelVisualStyle = {
  gradient: string;
  border: string;
  text: string;
  shimmer: boolean;
  letter?: string;
};

export const MEMBERSHIP_LEVEL_VISUAL_STYLE: Record<
  MembershipLevel,
  MembershipLevelVisualStyle
> = {
  requester: {
    gradient: "from-gray-400 to-gray-600",
    border: "border-gray-400",
    text: "text-gray-700",
    shimmer: false,
  },
  basic: {
    gradient: "from-slate-600 to-slate-800",
    border: "border-slate-600",
    text: "text-white",
    shimmer: false,
  },
  brons: {
    gradient: "from-indigo-700 to-indigo-950",
    border: "border-indigo-700",
    text: "text-white",
    shimmer: true,
  },
  silver: {
    gradient: "from-emerald-700 to-emerald-950",
    border: "border-emerald-700",
    text: "text-white",
    shimmer: true,
  },
  guld: {
    gradient: "from-[#E4CAA0] to-[#c9a86c]",
    border: "border-[#E4CAA0]",
    text: "text-gray-900",
    shimmer: true,
  },
  privilege: {
    gradient: "from-[#2F0E15] to-[#1a080b]",
    border: "border-[#2F0E15]",
    text: "text-white",
    shimmer: true,
  },
  founding_member: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
    border: "#C0A060",
    text: "text-white",
    shimmer: true,
    letter: "F",
  },
};

function resolveLevelStyle(level: string | null | undefined) {
  return MEMBERSHIP_LEVEL_VISUAL_STYLE[normalizeMembershipLevel(level)];
}

function isCssGradient(gradient: string): boolean {
  return gradient.includes("linear-gradient");
}

/** Pill / tab background + text for membership discount badges. */
export function membershipLevelDiscountBadgeClassName(
  level: string | null | undefined,
): string {
  const config = resolveLevelStyle(level);
  if (isCssGradient(config.gradient)) {
    return cn(config.text);
  }
  return cn("bg-gradient-to-br", config.gradient, config.text);
}

export function membershipLevelDiscountBadgeStyle(
  level: string | null | undefined,
): CSSProperties | undefined {
  const config = resolveLevelStyle(level);
  if (isCssGradient(config.gradient)) {
    return { backgroundImage: config.gradient };
  }
  return undefined;
}
