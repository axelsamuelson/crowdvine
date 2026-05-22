import { getCountryDisplayName } from "@/lib/countries";

export type PickerCountryOption = { code: string; name: string };

type ZoneWithCountry = { country_code?: string | null };

/** Unique ISO countries present in eligible geo zones, sorted by display name. */
export function countriesFromEligibleZones(
  zones: ZoneWithCountry[],
  locale: "en" | "sv" = "en",
): PickerCountryOption[] {
  const map = new Map<string, string>();
  for (const z of zones) {
    const cc = z.country_code?.trim().toUpperCase();
    if (!cc || map.has(cc)) continue;
    map.set(cc, getCountryDisplayName(cc, locale));
  }
  return [...map.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }));
}
