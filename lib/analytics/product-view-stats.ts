import { cache } from "react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type ProductViewStats = {
  plpViews: number;
  pdpViews: number;
  /** PDP views / PLP views (0 when no PLP impressions). */
  conversionRate: number;
};

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_EVENTS = 5000;

export function computePlpToPdpConversionRate(
  plpViews: number,
  pdpViews: number,
): number {
  if (plpViews <= 0) return 0;
  return pdpViews / plpViews;
}

function aggregateWineViewStats(
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

/**
 * PLP/PDP view counts per wine id from `user_events` (last N days by default).
 * Cached per request via React `cache()`.
 */
export const getProductViewStatsByWineId = cache(
  async (options?: {
    lookbackDays?: number | null;
  }): Promise<Map<string, ProductViewStats>> => {
    const lookbackDays =
      options?.lookbackDays === undefined
        ? DEFAULT_LOOKBACK_DAYS
        : options.lookbackDays;

    const sb = getSupabaseAdmin();
    let query = sb
      .from("user_events")
      .select("event_type, event_metadata, created_at")
      .in("event_type", ["product_list_viewed", "product_viewed"])
      .order("created_at", { ascending: false })
      .limit(MAX_EVENTS);

    if (lookbackDays != null && lookbackDays > 0) {
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
      query = query.gte("created_at", since.toISOString());
    }

    const { data: events, error } = await query;
    if (error) {
      console.warn("[product-view-stats]", error.message);
      return new Map();
    }

    return aggregateWineViewStats(events ?? []);
  },
);

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
