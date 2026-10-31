import { isDirtywineHost } from "@/lib/b2b-site";

/**
 * UI localization (language switching, browser-locale copy, bilingual strings)
 * is disabled on dirtywine.se — English-only for now.
 * Localhost defaults to pactwines (localization on) unless ?b2b=1.
 */
export function isUiLocalizationEnabled(
  host: string | null,
  searchParams?: { get: (key: string) => string | null } | null,
): boolean {
  return !isDirtywineHost(host, searchParams);
}

/** Client: respects ?b2b=1 on localhost. */
export function isUiLocalizationEnabledClient(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  return isUiLocalizationEnabled(window.location.hostname, params);
}
