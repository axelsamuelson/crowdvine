import { unstable_cache } from "next/cache";

import { supabaseBuildUsesPlaceholder } from "@/lib/supabase-build-placeholder";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PRODUCER_BOXES_PUBLISHED } from "@/lib/producer-boxes/config";
import { loadProducerBoxesCatalog } from "@/lib/producer-boxes/load";
import {
  resolveProducerBox,
  type ProducerBoxWineRow,
} from "@/lib/producer-boxes/match";
import type { WineCategoryFilter } from "@/lib/wine-category-types";
import { countLiveWinesByRegionValue } from "@/lib/wine-regions";

/** One cached read feeds every page during a build. */
export const SHOP_MENU_CATALOG_REVALIDATE_SECONDS = 3600;
const SHOP_MENU_CATALOG_TIMEOUT_MS = 8_000;

export type ShopMenuWine = {
  color: string | null;
  grape_varieties: string | null;
  tags: string[] | null;
  region: string | null;
};

export type ShopMenuCatalog = {
  shopLive: boolean;
  wines: ShopMenuWine[];
  regionCounts: Record<string, number>;
  boxesLive: boolean;
};

type MenuWineRow = ProducerBoxWineRow & ShopMenuWine;

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((tag): tag is string => typeof tag === "string");
}

export function wineMatchesMenuFilter(
  wine: ShopMenuWine,
  filter: WineCategoryFilter,
): boolean {
  if (filter.color?.length) {
    if (!wine.color || !filter.color.includes(wine.color)) return false;
  }
  if (filter.tags?.length) {
    const tags = new Set(wine.tags ?? []);
    if (!filter.tags.every((tag) => tags.has(tag))) return false;
  }
  if (filter.filterGrape) {
    const hay = (wine.grape_varieties ?? "").toLowerCase();
    if (!hay.includes(filter.filterGrape.toLowerCase())) return false;
  }
  if (filter.wineRegion && wine.region !== filter.wineRegion) return false;
  if (filter.farming?.length || filter.isNatural === true) return false;
  return true;
}

export function countWinesForFilter(
  wines: readonly ShopMenuWine[],
  filter: WineCategoryFilter,
): number {
  let count = 0;
  for (const wine of wines) {
    if (wineMatchesMenuFilter(wine, filter)) count += 1;
  }
  return count;
}

function toMenuRow(row: Record<string, unknown>): MenuWineRow {
  return {
    id: String(row.id ?? ""),
    producer_id: String(row.producer_id ?? ""),
    wine_name: String(row.wine_name ?? ""),
    handle: asString(row.handle),
    color: asString(row.color),
    vintage: asString(row.vintage),
    grape_varieties: asString(row.grape_varieties),
    tags: asTags(row.tags),
    region: asString(row.region),
    base_price_cents:
      typeof row.base_price_cents === "number" ? row.base_price_cents : null,
    is_live: row.is_live !== false,
    available_for_sale: row.available_for_sale !== false,
  };
}

async function fetchLiveMenuWines(signal: AbortSignal): Promise<MenuWineRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select(
      "id, producer_id, wine_name, handle, color, vintage, grape_varieties, tags, region, base_price_cents, is_live, available_for_sale, producers!inner(is_live)",
    )
    .eq("is_live", true)
    .eq("producers.is_live", true)
    .limit(5000)
    .abortSignal(signal);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toMenuRow(row as Record<string, unknown>));
}

async function boxesArePurchasable(
  wines: readonly MenuWineRow[],
  signal: AbortSignal,
): Promise<boolean> {
  if (!PRODUCER_BOXES_PUBLISHED) return false;
  try {
    const catalog = await loadProducerBoxesCatalog(signal);
    return catalog.boxes.some(
      (definition) => resolveProducerBox(definition, [], wines).purchasable,
    );
  } catch (error) {
    console.error("[shop-menu] boxes", error);
    return true;
  }
}

async function fetchShopMenuCatalog(): Promise<ShopMenuCatalog> {
  if (supabaseBuildUsesPlaceholder()) {
    throw new Error("placeholder supabase");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHOP_MENU_CATALOG_TIMEOUT_MS);
  try {
    const wines = await fetchLiveMenuWines(controller.signal);
    const regionCounts = Object.fromEntries(countLiveWinesByRegionValue(wines));
    const boxesLive = await boxesArePurchasable(wines, controller.signal);
    return {
      shopLive: wines.length > 0,
      wines: wines.map(({ color, grape_varieties, tags, region }) => ({
        color,
        grape_varieties,
        tags,
        region,
      })),
      regionCounts,
      boxesLive,
    };
  } finally {
    clearTimeout(timer);
  }
}

const getCachedShopMenuCatalog = unstable_cache(
  async (): Promise<ShopMenuCatalog | null> => {
    try {
      return await fetchShopMenuCatalog();
    } catch (error) {
      // Cache the miss so a build does not retry this on every page.
      // Abort the request too: a dangling fetch keeps the static worker parked.
      console.error("[shop-menu] catalog", error);
      return null;
    }
  },
  ["shop-menu-catalog-v1"],
  { revalidate: SHOP_MENU_CATALOG_REVALIDATE_SECONDS },
);

let inflight: Promise<ShopMenuCatalog | null> | null = null;

/**
 * Live counts for every header menu link.
 * One wines read, shared for an hour. A timeout or error returns null so the
 * menu renders every link instead of failing the page.
 */
export function getShopMenuCatalog(): Promise<ShopMenuCatalog | null> {
  if (!inflight) {
    inflight = getCachedShopMenuCatalog().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
