/**
 * Axel 12/11: members with the content-variant tag must not see
 * "naturvin" / "natural wine". Prefer existing helpers if present; otherwise
 * detect via auth user_metadata/app_metadata.content_variant (or
 * hide_natural_wine) and rewrite to hantverksvin / craft wine.
 *
 * Known tag values: "hantverk" | "hantverksvin" | "hide_natural" | "hide_natural_wine"
 */

import type { AppLocale } from "@/lib/i18n/locale";

export const WELCOME_CONTENT_VARIANT_META_KEY = "content_variant";
export const WELCOME_CONTENT_VARIANT_STORAGE_KEY = "pact_content_variant";

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

/** Read variant tag from Supabase auth user metadata bags. */
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

export function readContentVariantFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = window.localStorage.getItem(
      WELCOME_CONTENT_VARIANT_STORAGE_KEY,
    );
    if (fromLs) return fromLs;
  } catch {
    // ignore
  }
  try {
    const match = document.cookie.match(
      /(?:^|;\s*)pact_content_variant=([^;]+)/,
    );
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // ignore
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
