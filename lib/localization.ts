import { isDirtywineHost } from "@/lib/b2b-site";
import type { AppLocale } from "@/lib/i18n/locale";

/**
 * UI localization (language switching / bilingual toggle) is disabled on
 * dirtywine.se — Swedish-only fixed UI for Swedish restaurant customers.
 * Localhost defaults to pactwines (localization on) unless ?b2b=1.
 */
export function isUiLocalizationEnabled(
  host: string | null,
  searchParams?: { get: (key: string) => string | null } | null,
): boolean {
  return !isDirtywineHost(host, searchParams);
}

/**
 * Fixed locale when {@link isUiLocalizationEnabled} is false (Dirtywine).
 * Only Dirtywine disables the language switcher today.
 */
export const FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED: AppLocale = "sv";

/** Client: respects ?b2b=1 on localhost. */
export function isUiLocalizationEnabledClient(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  return isUiLocalizationEnabled(window.location.hostname, params);
}
