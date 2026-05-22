import { getCountryDisplayName } from "@/lib/countries";
import { isEnglishOnlyWineZone } from "@/lib/i18n/locale-policy";
import type { EligibleGeoZoneRow } from "@/lib/hooks/use-wine-zone-switcher";

export type ZonePickerRegionId =
  | "europe"
  | "africa"
  | "americas"
  | "asia_pacific"
  | "other";

const COUNTRY_TO_REGION: Record<string, ZonePickerRegionId> = {
  SE: "europe",
  NO: "europe",
  DK: "europe",
  FI: "europe",
  DE: "europe",
  FR: "europe",
  GB: "europe",
  IE: "europe",
  NL: "europe",
  BE: "europe",
  AT: "europe",
  CH: "europe",
  PL: "europe",
  PT: "europe",
  ES: "europe",
  IT: "europe",
  US: "americas",
  CA: "americas",
  MX: "americas",
  BR: "americas",
  AR: "americas",
  CL: "americas",
  CO: "americas",
  EG: "africa",
  ZA: "africa",
  NG: "africa",
  KE: "africa",
  MA: "africa",
  AU: "asia_pacific",
  NZ: "asia_pacific",
  JP: "asia_pacific",
  KR: "asia_pacific",
  SG: "asia_pacific",
  HK: "asia_pacific",
  IN: "asia_pacific",
  CN: "asia_pacific",
};

export const ZONE_PICKER_REGION_ORDER: ZonePickerRegionId[] = [
  "europe",
  "africa",
  "americas",
  "asia_pacific",
  "other",
];

export type ZonePickerRegionGroup = {
  id: ZonePickerRegionId;
  label: string;
  zones: EligibleGeoZoneRow[];
};

function regionForZone(zone: EligibleGeoZoneRow): ZonePickerRegionId {
  const cc = (zone.country_code ?? "").trim().toUpperCase();
  if (cc && COUNTRY_TO_REGION[cc]) return COUNTRY_TO_REGION[cc];
  const mc = (zone.market_code ?? "").trim().toUpperCase();
  if (mc === "US") return "americas";
  if (mc === "EU") return "europe";
  return "other";
}

export function regionLabel(
  id: ZonePickerRegionId,
  locale: "en" | "sv",
): string {
  const labels: Record<ZonePickerRegionId, { en: string; sv: string }> = {
    europe: { en: "Europe", sv: "Europa" },
    africa: { en: "Africa", sv: "Afrika" },
    americas: { en: "Americas", sv: "Amerika" },
    asia_pacific: { en: "Asia Pacific", sv: "Asien och Stillahavsområdet" },
    other: { en: "Other regions", sv: "Övriga regioner" },
  };
  return labels[id][locale];
}

/** Primary UI language shown on the location card. */
export function zonePrimaryLanguageLabel(
  zone: Pick<EligibleGeoZoneRow, "country_code" | "market_code">,
  locale: "en" | "sv",
): string {
  if (isEnglishOnlyWineZone(zone)) {
    return locale === "sv" ? "Engelska" : "English";
  }
  const cc = (zone.country_code ?? "").trim().toUpperCase();
  if (cc === "SE" || cc === "NO" || cc === "DK" || cc === "FI") {
    return locale === "sv" ? "Svenska" : "Swedish";
  }
  if (cc === "FR") return locale === "sv" ? "Franska" : "French";
  if (cc === "DE") return locale === "sv" ? "Tyska" : "German";
  return locale === "sv" ? "Engelska" : "English";
}

export function zoneCardTitle(
  zone: EligibleGeoZoneRow,
  locale: "en" | "sv",
): string {
  const named = zone.display_name?.trim();
  if (named) return named;
  const cc = (zone.country_code ?? "").trim().toUpperCase();
  if (cc) return getCountryDisplayName(cc, locale);
  return zone.id;
}

export function groupEligibleZonesByRegion(
  zones: EligibleGeoZoneRow[],
  locale: "en" | "sv",
): ZonePickerRegionGroup[] {
  const buckets = new Map<ZonePickerRegionId, EligibleGeoZoneRow[]>();
  for (const z of zones) {
    const id = regionForZone(z);
    const list = buckets.get(id) ?? [];
    list.push(z);
    buckets.set(id, list);
  }

  for (const list of buckets.values()) {
    list.sort((a, b) =>
      zoneCardTitle(a, locale).localeCompare(zoneCardTitle(b, locale), locale, {
        sensitivity: "base",
      }),
    );
  }

  return ZONE_PICKER_REGION_ORDER.filter((id) => (buckets.get(id)?.length ?? 0) > 0).map(
    (id) => ({
      id,
      label: regionLabel(id, locale),
      zones: buckets.get(id) ?? [],
    }),
  );
}
