/**
 * Localize the country segment of a wine-zone display name.
 * DB displayName often ends with "Sverige" even when UI locale is EN.
 */

import { getCountryDisplayName } from "@/lib/countries";

const KNOWN_COUNTRY_LABELS = new Set(
  [
    "Sweden",
    "Sverige",
    "Norway",
    "Norge",
    "Denmark",
    "Danmark",
    "Finland",
    "Germany",
    "Tyskland",
    "France",
    "Frankrike",
    "United Kingdom",
    "Storbritannien",
    "United States",
    "USA",
  ].map((s) => s.toLowerCase()),
);

export function locationLabelFromZone(
  displayName: string,
  countryCode: string,
  locale: "en" | "sv",
  fallback: string,
): string {
  const cc = countryCode.trim().toUpperCase();
  const localizedCountry = cc
    ? getCountryDisplayName(cc, locale)
    : "";

  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return localizedCountry || fallback;
  }

  if (parts.length === 1) {
    const only = parts[0]!;
    if (
      localizedCountry &&
      KNOWN_COUNTRY_LABELS.has(only.toLowerCase())
    ) {
      return localizedCountry;
    }
    // Single non-country segment (e.g. city) — keep as-is when no country code.
    if (!localizedCountry) return only;
    // Prefer localized country when the sole label looks like a country name,
    // otherwise keep the city/region string.
    return only;
  }

  const last = parts[parts.length - 1]!;
  if (
    localizedCountry &&
    KNOWN_COUNTRY_LABELS.has(last.toLowerCase())
  ) {
    return [...parts.slice(0, -1), localizedCountry].join(", ");
  }

  // If we have a country code, always localize the trailing country-ish segment
  // when it matches the code's SV/EN name pair via getCountryDisplayName either way.
  if (localizedCountry) {
    const en = getCountryDisplayName(cc, "en");
    const sv = getCountryDisplayName(cc, "sv");
    if (
      last.toLowerCase() === en.toLowerCase() ||
      last.toLowerCase() === sv.toLowerCase()
    ) {
      return [...parts.slice(0, -1), localizedCountry].join(", ");
    }
  }

  return parts.join(", ");
}
