import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type ProductViewStats = {
  plpViews: number;
  pdpViews: number;
  /** PDP views / PLP views (0 when no PLP impressions). */
  conversionRate: number;
};

const DEFAULT_LOOKBACK_DAYS = 30;

export function computePlpToPdpConversionRate(
  plpViews: number,
  pdpViews: number,
): number {
  if (plpViews <= 0) return 0;
  return pdpViews / plpViews;
}

/**
 * Pure JS aggregation (same rules as analytics_product_view_aggregates).
 * Kept for unit tests / parity checks against the SQL RPC.
 */
export function aggregateWineViewStats(
  events: Array<{
    event_type: string;
    event_metadata: unknown;
  }>,
): Map<string, ProductViewStats> {
  const rows = new Map<string, { plpViews: number; pdpViews: number }>();

  const ensure = (productId: string) => {
    let row = rows.get(productId);
    if (!row) {
      row = { plpViews: 0, pdpViews: 0 };
      rows.set(productId, row);
    }
    return row;
  };

  for (const event of events) {
    const md =
      event.event_metadata && typeof event.event_metadata === "object"
        ? (event.event_metadata as Record<string, unknown>)
        : {};

    if (event.event_type === "product_viewed") {
      const productId = md.productId;
      if (typeof productId === "string" && productId.trim()) {
        ensure(productId.trim()).pdpViews += 1;
      }
      continue;
    }

    if (event.event_type === "product_list_viewed") {
      const productIds = Array.isArray(md.productIds) ? md.productIds : [];
      for (const productId of productIds) {
        if (typeof productId === "string" && productId.trim()) {
          ensure(productId.trim()).plpViews += 1;
        }
      }
    }
  }

  const stats = new Map<string, ProductViewStats>();
  for (const [productId, row] of rows) {
    stats.set(productId, {
      plpViews: row.plpViews,
      pdpViews: row.pdpViews,
      conversionRate: computePlpToPdpConversionRate(row.plpViews, row.pdpViews),
    });
  }
  return stats;
}

function normalizeProductViewRecord(
  raw: unknown,
): Record<string, ProductViewStats> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, ProductViewStats> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const plpViews = Number(row.plpViews) || 0;
    const pdpViews = Number(row.pdpViews) || 0;
    out[id] = {
      plpViews,
      pdpViews,
      conversionRate: computePlpToPdpConversionRate(plpViews, pdpViews),
    };
  }
  return out;
}

/**
 * Fail-soft on RPC errors so SSG never fails when stats are unavailable.
 * Popularity sort then falls back to input order / zero rates.
 */
async function loadProductViewStatsRecord(
  lookbackDays: number,
): Promise<Record<string, ProductViewStats>> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("analytics_product_view_aggregates", {
      p_lookback_days: lookbackDays,
    });

    if (error) {
      console.warn("[product-view-stats]", error.message);
      return {};
    }

    return normalizeProductViewRecord(data);
  } catch (error) {
    console.warn("[product-view-stats]", error);
    return {};
  }
}

/**
 * PLP/PDP view counts per wine id from SQL aggregates (last N days by default).
 * Cached per request via React `cache()`. Fail-soft on RPC error.
 */
export const getProductViewStatsByWineId = cache(
  async (options?: {
    lookbackDays?: number | null;
  }): Promise<Map<string, ProductViewStats>> => {
    const lookbackDays =
      options?.lookbackDays === undefined || options.lookbackDays == null
        ? DEFAULT_LOOKBACK_DAYS
        : options.lookbackDays > 0
          ? options.lookbackDays
          : DEFAULT_LOOKBACK_DAYS;

    const record = await loadProductViewStatsRecord(lookbackDays);
    return productViewStatsFromRecord(record);
  },
);

/** Cross-request cache for PLP popularity sort (default on B2C shop). */
export const getCachedProductViewStatsByWineId = unstable_cache(
  async () => loadProductViewStatsRecord(DEFAULT_LOOKBACK_DAYS),
  ["product-view-stats-plp-rpc"],
  { revalidate: 3600 },
);

export function productViewStatsFromRecord(
  record: Record<string, ProductViewStats>,
): Map<string, ProductViewStats> {
  return new Map(Object.entries(record));
}

export function sortProductsByPopularity<T extends { id: string }>(
  products: T[],
  statsByWineId: Map<string, ProductViewStats>,
): T[] {
  return [...products].sort((a, b) => {
    const statsA = statsByWineId.get(a.id);
    const statsB = statsByWineId.get(b.id);
    const rateA = statsA?.conversionRate ?? 0;
    const rateB = statsB?.conversionRate ?? 0;
    if (rateB !== rateA) return rateB - rateA;

    const pdpA = statsA?.pdpViews ?? 0;
    const pdpB = statsB?.pdpViews ?? 0;
    if (pdpB !== pdpA) return pdpB - pdpA;

    const plpA = statsA?.plpViews ?? 0;
    const plpB = statsB?.plpViews ?? 0;
    return plpB - plpA;
  });
}
