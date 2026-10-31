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
  if (!uiLocalizationEnabled) return [DEFAULT_APP_LOCALE];
  if (isEnglishOnlyWineZone(zone)) return ["en"];
  return ["en", "sv"];
}

export function clampAppLocaleForZone(
  locale: AppLocale,
  zone: Pick<ResolvedActiveGeoZone, "countryCode" | "marketCode">,
  uiLocalizationEnabled: boolean,
): AppLocale {
  const allowed = availableAppLocalesForZone(zone, uiLocalizationEnabled);
  return allowed.includes(locale) ? locale : DEFAULT_APP_LOCALE;
}
