import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { grapeNameToSlug } from "@/lib/wine-grape-categories";
import { WINE_CATEGORIES_EN, WINE_CATEGORIES_SV } from "@/lib/wine-categories";

export type IndexableWineRow = {
  handle: string;
  updated_at: string | null;
};

export type IndexableProducerRow = {
  name: string;
  created_at: string | null;
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
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("producers")
    .select("name, created_at")
    .eq("is_live", true)
    .eq("status", "active")
    .order("name");

  if (error && /is_live|status/i.test(error.message)) {
    const fallback = await sb
      .from("producers")
      .select("name, created_at")
      .eq("status", "active")
      .order("name");
    return (fallback.data ?? []) as IndexableProducerRow[];
  }

  return (data ?? []) as IndexableProducerRow[];
}

/** Distinct grape slugs from indexable wines not already covered by static categories. */
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

  const slugs = new Set<string>();
  for (const row of wines ?? []) {
    if (!isIndexableWineRow(row as Parameters<typeof isIndexableWineRow>[0])) {
      continue;
    }
    for (const grape of parseGrapeVarieties(row.grape_varieties as string)) {
      const slug = grapeNameToSlug(grape);
      if (slug && !knownSlugs.has(slug)) {
        slugs.add(slug);
      }
    }
  }

  return Array.from(slugs).sort();
}

/** Producer shop collection slugs (/vin/{slug}, /wine/{slug}). */
export async function fetchProducerShopSlugs(): Promise<string[]> {
  const producers = await fetchIndexableProducers();
  return producers
    .map((p) => generateProducerSlug(String(p.name ?? "")))
    .filter(Boolean);
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
