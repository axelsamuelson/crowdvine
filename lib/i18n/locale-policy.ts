import type { AppLocale } from "@/lib/i18n/locale";
import { DEFAULT_APP_LOCALE, intlLocaleForAppLocale } from "@/lib/i18n/locale";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";

/** US wine zones: English-only UI (no Swedish toggle). */
export function isEnglishOnlyWineZone(
  zone: Pick<ResolvedActiveGeoZone, "countryCode" | "marketCode">,
): boolean {
  const cc = zone.countryCode?.trim().toUpperCase();
  if (cc === "US") return true;
  const mc = zone.marketCode?.trim().toUpperCase();
  return mc === "US";
}

export function availableAppLocalesForZone(
  zone: Pick<ResolvedActiveGeoZone, "countryCode" | "marketCode">,
  uiLocalizationEnabled: boolean,
): AppLocale[] {
  // Dirty Wine (ui localization off): Swedish-only chrome.
  if (!uiLocalizationEnabled) return ["sv"];
  if (isEnglishOnlyWineZone(zone)) return ["en"];
  return ["en", "sv"];
}

export function clampAppLocaleForZone(
  locale: AppLocale,
  zone: Pick<ResolvedActiveGeoZone, "countryCode" | "marketCode">,
  uiLocalizationEnabled: boolean,
): AppLocale {
  const allowed = availableAppLocalesForZone(zone, uiLocalizationEnabled);
  if (allowed.includes(locale)) return locale;
  return allowed[0] ?? DEFAULT_APP_LOCALE;
}
