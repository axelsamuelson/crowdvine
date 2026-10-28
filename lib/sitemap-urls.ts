import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import { fetchIndexableProducersFromDb } from "@/lib/crowdvine/indexable-producers";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  DYNAMIC_GRAPE_INDEX_MIN_WINES,
  grapeNameToSlug,
} from "@/lib/wine-grape-categories";
import { WINE_CATEGORIES_EN, WINE_CATEGORIES_SV } from "@/lib/wine-categories";

export type IndexableWineRow = {
  handle: string;
  updated_at: string | null;
};

export type IndexableProducerRow = {
  name: string;
  created_at: string | null;
  /** Prefer this for sitemap lastmod when present. */
  updated_at: string | null;
};

function parseGrapeVarieties(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

function wineTagsIncludeHidden(tags: unknown): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.some(
    (tag) => typeof tag === "string" && tag === HIDDEN_PRODUCT_TAG,
  );
}

function isIndexableWineRow(row: {
  handle?: string | null;
  available_for_sale?: boolean | null;
  tags?: unknown;
  producers?: { is_live?: boolean | null } | null;
}): boolean {
  if (!String(row.handle ?? "").trim()) return false;
  if (row.available_for_sale === false) return false;
  if (wineTagsIncludeHidden(row.tags)) return false;
  if (row.producers?.is_live === false) return false;
  return true;
}

export function getKnownCategorySlugs(): Set<string> {
  return new Set([
    ...WINE_CATEGORIES_SV.map((c) => c.slug),
    ...WINE_CATEGORIES_EN.map((c) => c.slug),
  ]);
}

/** Live, purchasable wines from active producers — aligned with indexable PDPs. */
export async function fetchIndexableWines(): Promise<IndexableWineRow[]> {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("wines")
    .select(
      "handle, updated_at, available_for_sale, tags, producers!inner(is_live, status)",
    )
    .eq("is_live", true)
    .eq("producers.status", "active");

  if (error) {
    const fallback = await sb
      .from("wines")
      .select("handle, updated_at, producers!inner(is_live, status)")
      .eq("is_live", true)
      .eq("producers.status", "active");

    if (fallback.error) return [];

    return (fallback.data ?? [])
      .filter((row) => isIndexableWineRow(row as Parameters<typeof isIndexableWineRow>[0]))
      .map((row) => ({
        handle: String(row.handle),
        updated_at: (row.updated_at as string | null) ?? null,
      }));
  }

  return (data ?? [])
    .filter((row) => isIndexableWineRow(row as Parameters<typeof isIndexableWineRow>[0]))
    .map((row) => ({
      handle: String(row.handle),
      updated_at: (row.updated_at as string | null) ?? null,
    }));
}

export async function fetchIndexableProducers(): Promise<IndexableProducerRow[]> {
  const withUpdated = await fetchIndexableProducersFromDb(
    "name, created_at, updated_at",
  );
  if (withUpdated.length > 0) {
    return (withUpdated as Array<Record<string, unknown>>).map((row) => ({
      name: String(row.name ?? ""),
      created_at: (row.created_at as string | null) ?? null,
      updated_at: (row.updated_at as string | null) ?? null,
    }));
  }

  // Older schemas without producers.updated_at still return created_at only.
  const legacy = await fetchIndexableProducersFromDb("name, created_at");
  return (legacy as Array<Record<string, unknown>>).map((row) => ({
    name: String(row.name ?? ""),
    created_at: (row.created_at as string | null) ?? null,
    updated_at: null,
  }));
}

/**
 * Distinct grape slugs from indexable wines not already covered by static
 * categories. Only grapes that appear on at least
 * {@link DYNAMIC_GRAPE_INDEX_MIN_WINES} wines are returned — thin one-wine
 * PLPs stay out of the sitemap.
 */
export async function fetchDynamicGrapeSlugs(
  knownSlugs: Set<string>,
): Promise<string[]> {
  const sb = getSupabaseAdmin();
  const { data: wines } = await sb
    .from("wines")
    .select(
      "grape_varieties, available_for_sale, tags, producers!inner(is_live, status)",
    )
    .eq("is_live", true)
    .eq("producers.status", "active")
    .not("grape_varieties", "is", null);

  const counts = new Map<string, number>();
  for (const row of wines ?? []) {
    if (!isIndexableWineRow(row as Parameters<typeof isIndexableWineRow>[0])) {
      continue;
    }
    for (const grape of parseGrapeVarieties(row.grape_varieties as string)) {
      const slug = grapeNameToSlug(grape);
      if (!slug || knownSlugs.has(slug)) continue;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= DYNAMIC_GRAPE_INDEX_MIN_WINES)
    .map(([slug]) => slug)
    .sort();
}

/**
 * Producer shop collection slugs (/vin/{slug}, /wine/{slug}).
 * Only producers that have at least one indexable wine (avoids empty PLPs in sitemap).
 */
export async function fetchProducerShopSlugs(): Promise<string[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select(
      "handle, available_for_sale, tags, producers!inner(name, is_live, status)",
    )
    .eq("is_live", true)
    .eq("producers.is_live", true)
    .eq("producers.status", "active");

  if (error) {
    // Fallback: all indexable producers (previous behaviour)
    const producers = await fetchIndexableProducers();
    return producers
      .map((p) => generateProducerSlug(String(p.name ?? "")))
      .filter(Boolean);
  }

  const slugs = new Set<string>();
  for (const row of data ?? []) {
    if (!isIndexableWineRow(row as Parameters<typeof isIndexableWineRow>[0])) {
      continue;
    }
    const producers = (
      row as { producers?: { name?: string } | { name?: string }[] }
    ).producers;
    const producer = Array.isArray(producers) ? producers[0] : producers;
    const name = producer?.name?.trim();
    if (!name) continue;
    const slug = generateProducerSlug(name);
    if (slug) slugs.add(slug);
  }
  return Array.from(slugs).sort();
}

/** Indexable producer profile rows that currently have ≥1 shop wine. */
export async function fetchIndexableProducersWithWines(): Promise<
  IndexableProducerRow[]
> {
  const shopSlugs = new Set(await fetchProducerShopSlugs());
  const producers = await fetchIndexableProducers();
  return producers.filter((p) =>
    shopSlugs.has(generateProducerSlug(String(p.name ?? ""))),
  );
}

export function dedupeSitemapEntries<T extends { url: string }>(
  entries: T[],
): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
