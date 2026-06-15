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

/** Slugs generated here — exclude from hand-written category lists. */
export const GENERATED_SHOP_FILTER_SLUGS = new Set<string>();

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
): WineCategory {
  GENERATED_SHOP_FILTER_SLUGS.add(slug);
  const prefix = locale === "sv" ? "/vin" : "/wine";
  const description =
    locale === "sv"
      ? `${h1} direktimporterat från Languedoc till Stockholm.`
      : `${h1} directly imported from Languedoc to Stockholm.`;
  const title =
    locale === "sv"
      ? `${h1} — direktimport | PACT Wines`
      : `${h1} — Direct Import | PACT Wines`;
  const metaDescription =
    locale === "sv"
      ? `Köp ${h1.toLowerCase()} online. Direkt från småproducenter i Languedoc — hemleverans Stockholm.`
      : `Buy ${h1.toLowerCase()} online. Direct from small producers in Languedoc — home delivery Stockholm.`;

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

function generateForLocale(locale: Locale): WineCategory[] {
  const categories: WineCategory[] = [];

  for (const color of SHOP_FILTER_COLORS) {
    const meta = locale === "sv" ? color.sv : color.en;
    const counterpart = locale === "sv" ? color.en : color.sv;
    categories.push(
      buildCategory(
        locale,
        meta.slug,
        meta.h1,
        { color: [color.db] },
        counterpart.slug,
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
      categories.push(
        buildCategory(
          locale,
          slug,
          h1,
          { color: [color.db], farming: [farming.db] },
          counterpartSlug,
        ),
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

export function findShopFilterCategory(
  locale: Locale,
  colorDb: string | null | undefined,
  farming: string | null | undefined,
  categories: WineCategory[],
): WineCategory | undefined {
  const color = colorDb?.trim() || null;
  const farm = farming || null;

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
