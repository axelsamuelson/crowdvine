import type { ShopFarmingFilterValue } from "@/lib/shop/farming-filter";
import type {
  WineCategory,
  WineCategoryFilter,
} from "@/lib/wine-category-types";

type Locale = "sv" | "en";

type ColorDef = {
  db: string;
  en: { slug: string; h1: string; short: string };
  sv: { slug: string; h1: string; short: string };
};

type FarmingDef = {
  db: ShopFarmingFilterValue;
  en: { slug: string; h1: string; short: string };
  sv: { slug: string; h1: string; short: string };
};

export const SHOP_FILTER_COLORS: ColorDef[] = [
  {
    db: "Red",
    en: { slug: "red-wine", h1: "Red Wine", short: "red" },
    sv: { slug: "rott-vin", h1: "Rött vin", short: "rott" },
  },
  {
    db: "White",
    en: { slug: "white-wine", h1: "White Wine", short: "white" },
    sv: { slug: "vitt-vin", h1: "Vitt vin", short: "vitt" },
  },
  {
    db: "Orange",
    en: { slug: "orange-wine", h1: "Orange Wine", short: "orange" },
    sv: { slug: "orange-vin", h1: "Orange vin", short: "orange" },
  },
  {
    db: "Red & White",
    en: {
      slug: "red-and-white-wine",
      h1: "Red & White Wine",
      short: "red-and-white",
    },
    sv: {
      slug: "rod-och-vit-vin",
      h1: "Rött & vitt vin",
      short: "rod-och-vit",
    },
  },
  {
    db: "Red & Orange",
    en: {
      slug: "red-and-orange-wine",
      h1: "Red & Orange Wine",
      short: "red-and-orange",
    },
    sv: {
      slug: "rod-och-orange-vin",
      h1: "Rött & orange vin",
      short: "rod-och-orange",
    },
  },
];

export const SHOP_FILTER_FARMING: FarmingDef[] = [
  {
    db: "natural",
    en: { slug: "natural-wine", h1: "Natural Wine", short: "natural" },
    sv: { slug: "naturvin", h1: "Naturvin", short: "naturvin" },
  },
  {
    db: "organic_certified",
    en: { slug: "organic-wine", h1: "Organic Wine", short: "organic" },
    sv: { slug: "ekologiskt-vin", h1: "Ekologiskt vin", short: "ekologiskt" },
  },
  {
    db: "biodynamic_certified",
    en: {
      slug: "biodynamic-wine",
      h1: "Biodynamic Wine",
      short: "biodynamic",
    },
    sv: {
      slug: "biodynamiskt-vin",
      h1: "Biodynamiskt vin",
      short: "biodynamiskt",
    },
  },
];

const PRIMARY_COLOR_DBS = new Set(["Red", "White", "Orange"]);

function isPrimaryShopColor(colorDb: string): boolean {
  return PRIMARY_COLOR_DBS.has(colorDb);
}

/** Slugs used for filter navigation matching (not legacy redirect-only pages). */
export const GENERATED_SHOP_FILTER_SLUGS = new Set<string>();

/**
 * Color-only and farming=natural hub slugs that 301 to the natural default.
 * Kept in the category list for slug lookup until the redirect fires.
 */
export const LEGACY_SHOP_REDIRECT_SLUGS = new Set<string>([
  "red-wine",
  "white-wine",
  "orange-wine",
  "rott-vin",
  "vitt-vin",
  "orange-vin",
  "natural-wine",
  "naturvin",
  "direktimport-vin",
  "direct-import-wine",
  "naturvin-languedoc",
  "rott-naturvin-languedoc",
  "vitt-naturvin-languedoc",
  "orange-naturvin-languedoc",
  "natural-wine-languedoc",
  "red-natural-wine-languedoc",
  "white-natural-wine-languedoc",
  "orange-natural-wine-languedoc",
]);

function comboSlug(
  color: ColorDef,
  farming: FarmingDef,
  locale: Locale,
): string {
  if (locale === "en") {
    return `${color.en.short}-${farming.en.short}-wine`;
  }
  const colorPart = color.sv.slug.replace(/-vin$/, "");
  return `${colorPart}-${farming.sv.slug}`;
}

function comboH1(color: ColorDef, farming: FarmingDef, locale: Locale): string {
  if (locale === "en") {
    return `${color.en.h1.replace(/ Wine$/, "")} ${farming.en.h1}`;
  }
  const colorLabel = color.sv.h1.replace(/ vin$/, "");
  const farmingLabel =
    farming.db === "natural"
      ? "naturvin"
      : farming.db === "organic_certified"
        ? "ekologiskt vin"
        : "biodynamiskt vin";
  return `${colorLabel} ${farmingLabel}`;
}

function buildCategory(
  locale: Locale,
  slug: string,
  h1: string,
  filter: WineCategoryFilter,
  hreflang: string,
  options?: { navigable?: boolean },
): WineCategory {
  const navigable = options?.navigable !== false;
  if (navigable) {
    GENERATED_SHOP_FILTER_SLUGS.add(slug);
  }
  const prefix = locale === "sv" ? "/vin" : "/wine";
  // Site name resolved at request time via localizeGeneratedCategoryCopy.
  const description =
    locale === "sv"
      ? `${h1} online hos PACT Wines.`
      : `${h1} online at PACT Wines.`;
  const title = `${h1} | PACT Wines`;
  // Closing phrase is pact-default; dirtywine rewrites via localizeGeneratedCategoryCopy.
  const metaDescription =
    locale === "sv"
      ? `Köp ${h1.toLowerCase()} online. Hemleverans Stockholm.`
      : `Buy ${h1.toLowerCase()} online. Home delivery in Stockholm.`;

  return {
    slug,
    locale,
    h1,
    title,
    metaDescription,
    description,
    filter,
    hreflang,
    canonical: `${prefix}/${slug}`,
  };
}

/**
 * On dirtywine.se, replace home-delivery clauses in meta with the B2B restaurant
 * phrase. Pact metas are left unchanged. Handles overrides and buildCategory output.
 */
export function localizeShopMetaDescription(
  meta: string,
  locale: Locale,
  isDirtyWine: boolean,
): string {
  if (!isDirtyWine || !meta) return meta;

  let result = meta;

  if (locale === "sv") {
    const restaurant = "För restauranger i Stockholm.";
    const restaurantMid = "för restauranger i Stockholm";
    // Mid-sentence "med hemleverans …"
    result = result.replace(
      /\bmed hemleverans i Stockholm\b/gi,
      restaurantMid,
    );
    result = result.replace(/\bmed hemleverans Stockholm\b/gi, restaurantMid);
    // Em-dash / comma clauses: "— hemleverans Stockholm via PACT"
    result = result.replace(
      /\s*[—–-]\s*hemleverans(?:\s+i)?\s+Stockholm(?:\s+via\s+PACT)?\.?/gi,
      `. ${restaurant}`,
    );
    result = result.replace(
      /,\s*hemleverans(?:\s+i)?\s+Stockholm(?:\s+via\s+PACT)?\.?/gi,
      `. ${restaurant}`,
    );
    // Standalone sentence: "Hemleverans Stockholm via PACT." / "Hemleverans i Stockholm."
    result = result.replace(
      /(?:^|\.\s*)Hemleverans(?:\s+i)?\s+Stockholm(?:\s+via\s+PACT)?\.?/gi,
      (match) => {
        const prefix = match.startsWith(".") ? ". " : "";
        return `${prefix}${restaurant}`;
      },
    );
    // Trailing buildCategory form
    result = result.replace(
      /\s*Hemleverans(?:\s+i)?\s+Stockholm\.?\s*$/i,
      ` ${restaurant}`,
    );
  } else {
    const restaurant = "For restaurants in Stockholm.";
    const restaurantMid = "for restaurants in Stockholm";
    result = result.replace(
      /\bwith home delivery in Stockholm\b/gi,
      restaurantMid,
    );
    result = result.replace(
      /\s*[—–-]\s*home delivery(?:\s+in)?\s+Stockholm(?:\s+via\s+PACT)?\.?/gi,
      `. ${restaurant}`,
    );
    result = result.replace(
      /,\s*home delivery(?:\s+in)?\s+Stockholm(?:\s+via\s+PACT)?\.?/gi,
      `. ${restaurant}`,
    );
    result = result.replace(
      /(?:^|\.\s*)Home delivery(?:\s+in)?\s+Stockholm(?:\s+via\s+PACT)?\.?/gi,
      (match) => {
        const prefix = match.startsWith(".") ? ". " : "";
        return `${prefix}${restaurant}`;
      },
    );
    result = result.replace(
      /\s*Home delivery(?:\s+in)?\s+Stockholm\.?\s*$/i,
      ` ${restaurant}`,
    );
  }

  // Collapse accidental double spaces / duplicate periods from replacements.
  result = result.replace(/\s{2,}/g, " ").replace(/\.\s*\./g, ".").trim();
  return result;
}

/** Apply site-specific copy for generated filter/grape category intros and metas. */
export function localizeGeneratedCategoryCopy(
  category: WineCategory,
  siteName: string,
  isDirtyWine: boolean,
): Pick<WineCategory, "description" | "metaDescription"> {
  const description = category.description.replace(/PACT Wines/g, siteName);
  const metaDescription = localizeShopMetaDescription(
    category.metaDescription,
    category.locale,
    isDirtyWine,
  );

  return { description, metaDescription };
}

function generateForLocale(locale: Locale): WineCategory[] {
  const categories: WineCategory[] = [];

  for (const color of SHOP_FILTER_COLORS) {
    const meta = locale === "sv" ? color.sv : color.en;
    const counterpart = locale === "sv" ? color.en : color.sv;
    const isPrimary = isPrimaryShopColor(color.db);
    categories.push(
      buildCategory(
        locale,
        meta.slug,
        meta.h1,
        { color: [color.db] },
        counterpart.slug,
        // Primary color hubs redirect to *-natural-*; blends stay navigable.
        { navigable: !isPrimary },
      ),
    );
  }

  for (const farming of SHOP_FILTER_FARMING) {
    const meta = locale === "sv" ? farming.sv : farming.en;
    const counterpart = locale === "sv" ? farming.en : farming.sv;
    categories.push(
      buildCategory(
        locale,
        meta.slug,
        meta.h1,
        { farming: [farming.db] },
        counterpart.slug,
        // natural-wine / naturvin redirect to the shop root.
        { navigable: farming.db !== "natural" },
      ),
    );
  }

  for (const color of SHOP_FILTER_COLORS) {
    for (const farming of SHOP_FILTER_FARMING) {
      const slug = comboSlug(color, farming, locale);
      const h1 = comboH1(color, farming, locale);
      const counterpartSlug = comboSlug(
        color,
        farming,
        locale === "sv" ? "en" : "sv",
      );
      // Natural farming is the shop default: color-only filter (incl. two-color
      // blends, which stay noindex via isNoindexCategorySlug). Organic /
      // biodynamic combos keep an explicit farming constraint.
      const filter: WineCategoryFilter =
        farming.db === "natural"
          ? { color: [color.db] }
          : { color: [color.db], farming: [farming.db] };
      categories.push(
        buildCategory(locale, slug, h1, filter, counterpartSlug),
      );
    }
  }

  return categories;
}

export const GENERATED_WINE_CATEGORIES_SV = generateForLocale("sv");
export const GENERATED_WINE_CATEGORIES_EN = generateForLocale("en");

export function mapUiColorToDb(colorName: string): string {
  const uiToDb: Record<string, string> = {
    "Red/White": "Red & White",
    "Red/Orange": "Red & Orange",
  };
  return uiToDb[colorName] ?? colorName;
}

export function mapDbColorToUi(dbColor: string): string {
  const dbToUi: Record<string, string> = {
    "Red & White": "Red/White",
    "Red & Orange": "Red/Orange",
  };
  return dbToUi[dbColor] ?? dbColor;
}

function naturalComboSlugForColor(
  colorDb: string,
  locale: Locale,
): string | null {
  const color = SHOP_FILTER_COLORS.find((c) => c.db === colorDb);
  const natural = SHOP_FILTER_FARMING.find((f) => f.db === "natural");
  if (!color || !natural || !isPrimaryShopColor(colorDb)) return null;
  return comboSlug(color, natural, locale);
}

export function findShopFilterCategory(
  locale: Locale,
  colorDb: string | null | undefined,
  farming: string | null | undefined,
  categories: WineCategory[],
): WineCategory | undefined {
  const color = colorDb?.trim() || null;
  // "natural" is the shop default, not a filter dimension in the path model.
  const farm =
    !farming || farming === "natural" ? null : farming;

  if (!color && !farm) return undefined;

  if (color && !farm) {
    const naturalSlug = naturalComboSlugForColor(color, locale);
    if (naturalSlug) {
      return categories.find((c) => c.slug === naturalSlug);
    }
  }

  return categories.find((c) => {
    if (!GENERATED_SHOP_FILTER_SLUGS.has(c.slug)) return false;
    const cColor = c.filter.color?.length === 1 ? c.filter.color[0] : null;
    const cFarm =
      c.filter.farming?.length === 1 ? c.filter.farming[0] : null;
    return cColor === color && cFarm === farm;
  });
}

export function resolveShopFilterCategoryUrl(
  locale: Locale,
  colorDb: string | null | undefined,
  farming: string | null | undefined,
  categories: WineCategory[],
): string | null {
  const match = findShopFilterCategory(locale, colorDb, farming, categories);
  return match?.canonical ?? null;
}
