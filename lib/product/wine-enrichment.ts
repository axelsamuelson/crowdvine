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

const PRODUCER_CERTIFICATION_BASE_LABELS: Record<
  string,
  Record<AppLocale, string>
> = {
  natural: {
    sv: "Naturvin",
    en: "Natural",
  },
  sustainable: {
    sv: "Hållbar odling",
    en: "Sustainable",
  },
  conventional: {
    sv: "Konventionell",
    en: "Conventional",
  },
};

const ORGANIC_CERTIFIED_LABEL: Record<AppLocale, string> = {
  sv: "Ekologiskt certifierad",
  en: "Organic Certified",
};

const ORGANIC_CLAIMED_LABEL: Record<AppLocale, string> = {
  sv: "Ekologiskt (enligt producenten)",
  en: "Organic (according to the producer)",
};

const ORGANIC_CONVERSION_LABEL: Record<AppLocale, string> = {
  sv: "Ekologiskt (under omställning)",
  en: "Organic (in conversion)",
};

const BIODYNAMIC_CLAIMED_LABEL: Record<AppLocale, string> = {
  sv: "Biodynamiskt (enligt producenten)",
  en: "Biodynamic (according to the producer)",
};

/** Unverified biodynamic producers that also farm organically (e.g. Mas Des Mesures). */
const ORGANIC_AND_BIODYNAMIC_CLAIMED_LABEL: Record<AppLocale, string> = {
  sv: "Ekologisk och biodynamisk odling (enligt producenten)",
  en: "Organic and biodynamic farming (according to the producer)",
};

const ORGANIC_LAPSED_FARMING_LABEL: Record<AppLocale, string> = {
  sv: "Ekologisk odling enligt producenten, certifieringen har upphört",
  en: "Organic farming according to the producer; certification has lapsed",
};

export type ProducerCertificationLabel = {
  text: string;
  /** Organic registry link when the organic claim is verified (or in conversion). */
  href?: string | null;
};

export type ProducerCertificationLabelOptions = {
  certificationVerifiedUrl?: string | null;
  certificationInConversion?: boolean | null;
  /** Agence Bio ARRETEE / stopped — hide certification chips. */
  certificationLapsed?: boolean | null;
};

/** Non-empty http(s) registry URL → organic claim may use Certified / in-conversion wording. */
export function producerCertificationRegistryUrl(
  verifiedUrl: string | null | undefined,
): string | null {
  const trimmed = verifiedUrl?.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

/** Farming copy when organic certification has lapsed (no certification chip). */
export function formatProducerLapsedOrganicFarming(
  locale: AppLocale = "en",
): string {
  return ORGANIC_LAPSED_FARMING_LABEL[locale];
}

/**
 * Farming copy for biodynamic producers without an organic registry URL
 * (e.g. Mas Des Mesures — not shown as Organic Certified).
 */
export function formatProducerOrganicAndBiodynamicFarming(
  locale: AppLocale = "en",
): string {
  return ORGANIC_AND_BIODYNAMIC_CLAIMED_LABEL[locale];
}

/**
 * Public producer certification chips.
 * - `natural` never becomes Certified/Certifierad.
 * - Lapsed organic certification → no chips (use farming field instead).
 * - Verified organic registry URL → Organic Certified (or in conversion) + link.
 * - `biodynamic_certified` without registry URL → organic + biodynamic according-to-producer.
 * - `biodynamic_certified` with organic registry URL → Organic Certified + biodynamic claimed.
 */
export function formatProducerCertificationLabels(
  value: string | null | undefined,
  locale: AppLocale = "en",
  options?: ProducerCertificationLabelOptions,
): ProducerCertificationLabel[] {
  const trimmed = value?.trim();
  if (!trimmed) return [];

  if (options?.certificationLapsed) {
    return [];
  }

  // natural / sustainable / conventional are never Certified/Certifierad.
  const baseOnly = PRODUCER_CERTIFICATION_BASE_LABELS[trimmed];
  if (baseOnly) {
    return [{ text: baseOnly[locale] }];
  }

  const registryUrl = producerCertificationRegistryUrl(
    options?.certificationVerifiedUrl,
  );
  const inConversion = Boolean(options?.certificationInConversion && registryUrl);
  const labels: ProducerCertificationLabel[] = [];

  if (registryUrl) {
    labels.push({
      text: (inConversion
        ? ORGANIC_CONVERSION_LABEL
        : ORGANIC_CERTIFIED_LABEL)[locale],
      href: registryUrl,
    });
  }

  if (trimmed === "biodynamic_certified") {
    if (registryUrl) {
      labels.push({ text: BIODYNAMIC_CLAIMED_LABEL[locale] });
    } else {
      labels.push({ text: ORGANIC_AND_BIODYNAMIC_CLAIMED_LABEL[locale] });
    }
  } else if (trimmed === "organic_certified" && !registryUrl) {
    labels.push({ text: ORGANIC_CLAIMED_LABEL[locale] });
  } else if (
    trimmed !== "organic_certified" &&
    trimmed !== "biodynamic_certified"
  ) {
    labels.push({
      text: formatFarmingLabel(trimmed, locale) ?? trimmed,
    });
  }

  return labels;
}

/** Locale-aware joined label for compact surfaces (shop editorial, hero meta). */
export function formatProducerCertification(
  value: string | null | undefined,
  locale: AppLocale = "en",
  options?: ProducerCertificationLabelOptions,
): string | null {
  const labels = formatProducerCertificationLabels(value, locale, options);
  if (labels.length === 0) return null;
  return labels.map((label) => label.text).join(" · ");
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
