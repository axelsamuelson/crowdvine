import type { AppLocale } from "@/lib/i18n/locale";
import {
  getLevelDisplayName,
  normalizeMembershipLevel,
  type MembershipLevel,
} from "@/lib/membership/points-engine";

export type WelcomeModalMembershipLevel =
  | "basic"
  | "brons"
  | "silver"
  | "guld"
  | "privilege"
  | "founding_member";

export function welcomeModalTier(raw: string): WelcomeModalMembershipLevel {
  const n = normalizeMembershipLevel(raw);
  if (n === "requester") return "basic";
  if (n === "founding_member") return "founding_member";
  return n as WelcomeModalMembershipLevel;
}

/** Display name for step 3 — SV Brons/Guld when locale is sv. */
export function welcomeModalLevelDisplayName(
  level: WelcomeModalMembershipLevel,
  locale: AppLocale,
): string {
  return getLevelDisplayName(level as MembershipLevel, locale);
}
