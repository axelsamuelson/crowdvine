import type { AppLocale } from "@/lib/i18n/locale";
import { DEFAULT_APP_LOCALE, intlLocaleForAppLocale } from "@/lib/i18n/locale";
import { FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED } from "@/lib/localization";
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
  // Dirtywine: no switcher — Swedish-only for Swedish restaurant customers.
  if (!uiLocalizationEnabled) return [FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED];
  if (isEnglishOnlyWineZone(zone)) return ["en"];
  return ["en", "sv"];
}

export function clampAppLocaleForZone(
  locale: AppLocale,
  zone: Pick<ResolvedActiveGeoZone, "countryCode" | "marketCode">,
  uiLocalizationEnabled: boolean,
): AppLocale {
  const allowed = availableAppLocalesForZone(zone, uiLocalizationEnabled);
  const fallback = uiLocalizationEnabled
    ? DEFAULT_APP_LOCALE
    : FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED;
  return allowed.includes(locale) ? locale : fallback;
}
