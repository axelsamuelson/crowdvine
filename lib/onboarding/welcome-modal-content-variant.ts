/**
 * Welcome-modal stopgap for Axel’s 12/11 “hidden content” / hantverksvin idea.
 *
 * Repo + design canvas (12/11): no person tag, glossary, or catalog filter is
 * built yet (“Inget är byggt”). Full program is PR-plan A–F and needs Axel OK.
 * Canvas rule: tag follows the person — not a cookie / address.
 *
 * Until PR A ships a real profile tag, the welcome modal only:
 * - reads auth user_metadata/app_metadata.content_variant (or hide_natural_wine)
 * - accepts an explicit preview prop on /dev/welcome-modal (?hideNatural=1)
 * and rewrites naturvin → hantverksvin / natural wine → craft wine in modal copy.
 */

import type { AppLocale } from "@/lib/i18n/locale";

export const WELCOME_CONTENT_VARIANT_META_KEY = "content_variant";

const VARIANT_TAG_VALUES = new Set([
  "hantverk",
  "hantverksvin",
  "hantverksviner",
  "hide_natural",
  "hide_natural_wine",
  "1",
  "true",
]);

export function isNaturalWineHiddenVariantTag(
  raw: string | null | undefined,
): boolean {
  if (raw == null) return false;
  return VARIANT_TAG_VALUES.has(String(raw).trim().toLowerCase());
}

/** Read variant tag from Supabase auth user metadata bags (person-scoped). */
export function contentVariantFromAuthUser(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null | undefined): string | null {
  if (!user) return null;
  for (const bag of [user.app_metadata, user.user_metadata]) {
    if (!bag || typeof bag !== "object") continue;
    const v =
      bag[WELCOME_CONTENT_VARIANT_META_KEY] ??
      bag.hide_natural_wine ??
      bag.hide_natural;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v === true) return "hantverk";
  }
  return null;
}

/**
 * Rewrite welcome-modal (and similar) strings so variant members never see
 * naturvin / natural wine. Order matters (longer phrases first).
 */
export function applyNaturalWineCopyVariant(
  text: string,
  locale: AppLocale,
  hideNaturalWine: boolean,
): string {
  if (!hideNaturalWine || !text) return text;

  if (locale === "sv") {
    return text
      .replace(/Naturvinskaraktär/g, "Hantverkskaraktär")
      .replace(/naturvinskaraktär/g, "hantverkskaraktär")
      .replace(/Naturvinsproducenter/g, "Hantverksproducenter")
      .replace(/naturvinsproducenter/g, "hantverksproducenter")
      .replace(/Naturvinsproducent/g, "Hantverksproducent")
      .replace(/naturvinsproducent/g, "hantverksproducent")
      .replace(/Naturviner/g, "Hantverksviner")
      .replace(/naturviner/g, "hantverksviner")
      .replace(/Naturvinet/g, "Hantverksvinet")
      .replace(/naturvinet/g, "hantverksvinet")
      .replace(/Naturvin/g, "Hantverksvin")
      .replace(/naturvin/g, "hantverksvin");
  }

  return text
    .replace(/French natural wine/g, "French craft wine")
    .replace(/french natural wine/g, "french craft wine")
    .replace(/Natural wines/g, "Craft wines")
    .replace(/natural wines/g, "craft wines")
    .replace(/Natural wine/g, "Craft wine")
    .replace(/natural wine/g, "craft wine");
}
