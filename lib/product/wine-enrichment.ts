import type { AppLocale } from "@/lib/i18n/locale";
import { extractWineText } from "@/lib/i18n/wine-locale";
import { translate } from "@/lib/i18n/messages";
import type { WineEnrichment } from "@/lib/shopify/types";

export type EnrichmentSpecKey =
  | "color"
  | "producer"
  | "grapeVariety"
  | "appellation"
  | "farmingAndAdditives"
  | "abv"
  | "servingTemp"
  | "elevation"
  | "soilType";

export const PAIRED_ENRICHMENT_SPEC_KEYS: readonly (readonly EnrichmentSpecKey[])[] =
  [
    ["color", "producer"],
    ["abv", "servingTemp"],
  ] as const;

/** Single grid fill order — row by row, left then right. */
export const ENRICHMENT_SPEC_DISPLAY_ORDER: readonly EnrichmentSpecKey[] = [
  "color",
  "producer",
  "grapeVariety",
  "appellation",
  "farmingAndAdditives",
  "abv",
  "servingTemp",
  "elevation",
  "soilType",
] as const;

export const PAIRED_ENRICHMENT_SPEC_KEY_SET = new Set(
  PAIRED_ENRICHMENT_SPEC_KEYS.flat(),
);

export function enrichmentSpecLabelKey(key: EnrichmentSpecKey): string {
  return `product.spec.${key}`;
}

export function formatFarmingLabel(
  value: string | null | undefined,
  locale: AppLocale = "en",
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const msgKey = `product.farming.${trimmed}`;
  const translated = translate(locale, msgKey);
  return translated !== msgKey ? translated : trimmed;
}

const PRODUCER_CERTIFICATION_LABELS: Record<
  string,
  Record<AppLocale, string>
> = {
  organic_certified: {
    sv: "Ekologisk certifierad",
    en: "Organic Certified",
  },
  biodynamic_certified: {
    sv: "Biodynamisk",
    en: "Biodynamic",
  },
  natural: {
    sv: "Naturvin",
    en: "Natural",
  },
};

/** Locale-aware labels for producer profile certification enum. */
export function formatProducerCertification(
  value: string | null | undefined,
  locale: AppLocale = "en",
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const known = PRODUCER_CERTIFICATION_LABELS[trimmed]?.[locale];
  if (known) return known;
  return formatFarmingLabel(trimmed, locale);
}

function coerceEnrichmentText(
  value: unknown,
  locale: AppLocale,
): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return extractWineText(
      value as Record<string, string>,
      locale === "en" ? "en" : "sv",
    );
  }
  return null;
}

export function formatFarmingAndAdditivesSpec(
  farming: string | null | undefined,
  additives: string | null | undefined,
  locale: AppLocale = "en",
): string | null {
  const farmingLabel = formatFarmingLabel(
    coerceEnrichmentText(farming, locale),
    locale,
  );
  const additivesText = coerceEnrichmentText(additives, locale);

  if (farmingLabel && additivesText) {
    return `${farmingLabel} · ${additivesText}`;
  }
  if (farmingLabel) return farmingLabel;
  if (additivesText) return additivesText;
  return null;
}

export function formatServingTemp(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/°/.test(trimmed)) return trimmed;
  return `${trimmed} °C`;
}

export function formatAbv(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/%/.test(trimmed)) return trimmed;
  return `${trimmed} %`;
}

export function resolveWineAbv(
  abv: string | null | undefined,
  alcoholPercentage: number | string | null | undefined,
): string | null {
  const fromText = abv?.trim();
  if (fromText) return formatAbv(fromText);

  if (alcoholPercentage == null || alcoholPercentage === "") return null;
  const num = Number(alcoholPercentage);
  if (!Number.isFinite(num)) return null;
  return formatAbv(String(num));
}

export function formatElevation(
  value: number | null | undefined,
  locale: AppLocale = "en",
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return translate(locale, "product.elevationMasl", { value });
}

export function formatGrapeVarietiesText(
  varieties: string[] | string | null | undefined,
): string | null {
  if (Array.isArray(varieties)) {
    const items = varieties.map((v) => v.trim()).filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
  }
  const trimmed = varieties?.trim();
  return trimmed || null;
}

export function formatStringList(
  values: string[] | null | undefined,
): string | null {
  if (!values?.length) return null;
  const items = values.map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items.join(", ") : null;
}

export function hasText(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return Boolean(value.trim());
}

export function hasStringList(values: string[] | null | undefined): boolean {
  return Boolean(formatStringList(values));
}

const WINE_COLOR_MESSAGE_KEYS: Record<string, string> = {
  red: "shop.wineColorRed",
  white: "shop.wineColorWhite",
  orange: "shop.wineColorOrange",
  rose: "shop.wineColorRose",
  rosé: "shop.wineColorRose",
  sparkling: "product.wineColorSparkling",
};

export function formatWineColorSpec(
  value: string | null | undefined,
  locale: AppLocale = "en",
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const [key, msgKey] of Object.entries(WINE_COLOR_MESSAGE_KEYS)) {
    if (lower === key || lower.includes(key)) {
      return translate(locale, msgKey);
    }
  }
  return trimmed;
}

export function buildEnrichmentSpecs(
  enrichment: WineEnrichment | null | undefined,
  locale: AppLocale = "en",
): Partial<Record<EnrichmentSpecKey, string>> {
  if (!enrichment) return {};

  const specs: Partial<Record<EnrichmentSpecKey, string>> = {};

  const color = formatWineColorSpec(enrichment.color, locale);
  if (color) specs.color = color;

  const grapes = formatGrapeVarietiesText(enrichment.grapeVarieties);
  if (grapes) specs.grapeVariety = grapes;

  const appellation = coerceEnrichmentText(enrichment.appellation, locale);
  if (appellation) specs.appellation = appellation;

  const farmingAndAdditives = formatFarmingAndAdditivesSpec(
    enrichment.farming,
    enrichment.additives,
    locale,
  );
  if (farmingAndAdditives) specs.farmingAndAdditives = farmingAndAdditives;

  const abv = resolveWineAbv(enrichment.abv, enrichment.alcohol_percentage);
  if (abv) specs.abv = abv;

  const servingTemp = formatServingTemp(enrichment.serving_temp_c);
  if (servingTemp) specs.servingTemp = servingTemp;

  const elevation = formatElevation(enrichment.elevation_masl, locale);
  if (elevation) specs.elevation = elevation;

  const soilType = coerceEnrichmentText(enrichment.soil_type, locale);
  if (soilType) specs.soilType = soilType;

  return specs;
}

export function buildPdpSpecs(
  enrichment: WineEnrichment | null | undefined,
  locale: AppLocale = "en",
  producerName?: string | null,
): Partial<Record<EnrichmentSpecKey, string>> {
  const specs = buildEnrichmentSpecs(enrichment, locale);
  const producer = producerName?.trim();
  if (producer) specs.producer = producer;
  return specs;
}

export function hasEnrichmentSpecs(
  enrichment: WineEnrichment | null | undefined,
  locale: AppLocale = "en",
  producerName?: string | null,
): boolean {
  return Object.keys(buildPdpSpecs(enrichment, locale, producerName)).length > 0;
}

export function hasExpandableEnrichment(
  enrichment: WineEnrichment | null | undefined,
): boolean {
  if (!enrichment) return false;
  return (
    hasText(enrichment.ageing) ||
    hasText(enrichment.winemaker_notes) ||
    hasStringList(enrichment.awards)
  );
}
