import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { WineCategory } from "@/lib/wine-category-types";
import {
  getWineCategoryEn,
  getWineCategoryEnCanonicalSlug,
  getWineCategorySv,
  getWineCategorySvCanonicalSlug,
  isWineCategoryEnAlias,
  isWineCategorySvAlias,
  WINE_CATEGORIES_EN,
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";

export function grapeNameToSlug(grapeName: string): string {
  return generateProducerSlug(grapeName);
}

function parseGrapeVarieties(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

export function buildDynamicGrapeCategory(
  grapeName: string,
  locale: "sv" | "en",
): WineCategory {
  const slug = grapeNameToSlug(grapeName);

  if (locale === "sv") {
    return {
      slug,
      locale: "sv",
      h1: `${grapeName}-viner`,
      title: `${grapeName} — naturvin från Languedoc | PACT Wines`,
      metaDescription: `Köp ${grapeName}-viner direktimporterade från Languedoc. Ekologiskt och biodynamiskt utan tillsatser. Hemleverans i Stockholm.`,
      description: `Bläddra bland naturviner med ${grapeName} direkt från småproducenter i Languedoc — direktimporterat till Stockholm.`,
      filter: { filterGrape: grapeName },
      hreflang: slug,
      canonical: `/vin/${slug}`,
    };
  }

  return {
    slug,
    locale: "en",
    h1: `${grapeName} Wines`,
    title: `${grapeName} Wines from Languedoc | PACT Wines`,
    metaDescription: `Buy ${grapeName} wines directly imported from Languedoc. Organic and biodynamic without additives. Home delivery in Stockholm.`,
    description: `Browse natural wines made with ${grapeName} from small producers in Languedoc — imported directly to Stockholm.`,
    filter: { filterGrape: grapeName },
    hreflang: slug,
    canonical: `/wine/${slug}`,
  };
}

export function getGrapeCategoryPath(
  grapeName: string,
  locale: "sv" | "en",
): string {
  const slug = grapeNameToSlug(grapeName);
  return locale === "sv" ? `/vin/${slug}` : `/wine/${slug}`;
}

export function getShopSegmentSlug(path: string): string | null {
  if (path.startsWith("/vin/")) {
    return path.slice("/vin/".length).split("/")[0] ?? null;
  }
  if (path.startsWith("/wine/")) {
    return path.slice("/wine/".length).split("/")[0] ?? null;
  }
  return null;
}

export function resolveGrapeNameFromSlug(
  slug: string,
  candidates: string[],
): string | null {
  const normalized = slug.trim().toLowerCase();
  return (
    candidates.find((g) => grapeNameToSlug(g) === normalized) ?? null
  );
}

function staticGrapeCategoryBySlug(
  slug: string,
  locale: "sv" | "en",
): WineCategory | undefined {
  const categories = locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;
  return categories.find(
    (c) =>
      c.slug === slug &&
      c.filter.filterGrape &&
      !c.filter.color?.length &&
      !c.filter.farming?.length &&
      !c.filter.tags?.length,
  );
}

async function findGrapeNameBySlug(slug: string): Promise<string | null> {
  const sb = getSupabaseAdmin();

  const { data: varieties } = await sb
    .from("grape_varieties")
    .select("name")
    .order("name");

  for (const row of varieties ?? []) {
    const name = String(row.name ?? "").trim();
    if (name && grapeNameToSlug(name) === slug) {
      return name;
    }
  }

  const { data: wines } = await sb
    .from("wines")
    .select("grape_varieties")
    .eq("is_live", true)
    .not("grape_varieties", "is", null);

  const names = new Set<string>();
  for (const row of wines ?? []) {
    parseGrapeVarieties(row.grape_varieties as string).forEach((n) =>
      names.add(n),
    );
  }

  return (
    Array.from(names).find((name) => grapeNameToSlug(name) === slug) ?? null
  );
}

export async function resolveGrapeCategoryBySlug(
  slug: string,
  locale: "sv" | "en",
): Promise<WineCategory | undefined> {
  const canonicalSlug =
    locale === "en"
      ? getWineCategoryEnCanonicalSlug(slug)
      : getWineCategorySvCanonicalSlug(slug);

  const staticCategory =
    locale === "en"
      ? getWineCategoryEn(slug)
      : getWineCategorySv(slug);
  if (staticCategory) return staticCategory;

  if (locale === "en" && isWineCategoryEnAlias(slug)) return undefined;
  if (locale === "sv" && isWineCategorySvAlias(slug)) return undefined;

  const categories = locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;
  if (categories.some((c) => c.slug === canonicalSlug)) return undefined;

  const staticGrape = staticGrapeCategoryBySlug(canonicalSlug, locale);
  if (staticGrape) return staticGrape;

  const grapeName = await findGrapeNameBySlug(canonicalSlug);
  if (!grapeName) return undefined;

  return buildDynamicGrapeCategory(grapeName, locale);
}

export function isGrapeOnlyCategory(category: WineCategory): boolean {
  return Boolean(
    category.filter.filterGrape &&
      !category.filter.color?.length &&
      !category.filter.farming?.length &&
      !category.filter.tags?.length,
  );
}
