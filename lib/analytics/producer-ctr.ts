import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createFailSoftLoader } from "@/lib/analytics/rpc-failsoft";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** How many names Popular Producers shows. */
export const POPULAR_PRODUCER_LIMIT = 5;

const DEFAULT_LOOKBACK_DAYS = 30;

export type ProducerCtrStats = {
  /** Times the producer appeared on a product list. */
  impressions: number;
  /** Product detail views for that producer. */
  clicks: number;
  /** Clicks / impressions. 0 when the producer has no list impressions. */
  ctr: number;
};

export function computeProducerCtr(clicks: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return clicks / impressions;
}

/**
 * Pure JS aggregation (same rules as analytics_producer_ctr_aggregates).
 * Kept for unit tests / parity checks against the SQL RPC.
 */
export function aggregateProducerCtr(
  events: Array<{
    event_type: string;
    event_metadata: unknown;
  }>,
): Map<string, ProducerCtrStats> {
  const rows = new Map<string, { impressions: number; clicks: number }>();

  const ensure = (producerId: string) => {
    let row = rows.get(producerId);
    if (!row) {
      row = { impressions: 0, clicks: 0 };
      rows.set(producerId, row);
    }
    return row;
  };

  for (const event of events) {
    const md =
      event.event_metadata && typeof event.event_metadata === "object"
        ? (event.event_metadata as Record<string, unknown>)
        : {};

    if (event.event_type === "product_viewed") {
      const producerId = md.producerId;
      if (typeof producerId === "string" && producerId.trim()) {
        ensure(producerId.trim()).clicks += 1;
      }
      continue;
    }

    if (event.event_type === "product_list_viewed") {
      const producerIds = Array.isArray(md.producerIds) ? md.producerIds : [];
      for (const producerId of producerIds) {
        if (typeof producerId === "string" && producerId.trim()) {
          ensure(producerId.trim()).impressions += 1;
        }
      }
    }
  }

  const stats = new Map<string, ProducerCtrStats>();
  for (const [producerId, row] of rows) {
    stats.set(producerId, {
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: computeProducerCtr(row.clicks, row.impressions),
    });
  }
  return stats;
}

export function producerCtrFromRecord(
  record: Record<string, ProducerCtrStats>,
): Map<string, ProducerCtrStats> {
  return new Map(Object.entries(record));
}

function normalizeProducerCtrRecord(
  raw: unknown,
): Record<string, ProducerCtrStats> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, ProducerCtrStats> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    out[id] = {
      impressions,
      clicks,
      ctr: computeProducerCtr(clicks, impressions),
    };
  }
  return out;
}

/**
 * Highest CTR first. Ties break on clicks, then impressions, then title.
 * Producers with no list impressions stay at CTR 0 and sort after anyone with data.
 */
export function pickTopCollectionsByCtr<
  T extends { id: string; handle: string; title: string },
>(
  collections: T[],
  statsByProducerId: Map<string, ProducerCtrStats>,
  limit = POPULAR_PRODUCER_LIMIT,
): T[] {
  const producers = collections.filter(
    (collection) => collection.handle !== "wine-boxes",
  );

  return [...producers]
    .sort((a, b) => {
      const statsA = statsByProducerId.get(a.id);
      const statsB = statsByProducerId.get(b.id);
      const ctrA = statsA?.ctr ?? 0;
      const ctrB = statsB?.ctr ?? 0;
      if (ctrB !== ctrA) return ctrB - ctrA;

      const clicksA = statsA?.clicks ?? 0;
      const clicksB = statsB?.clicks ?? 0;
      if (clicksB !== clicksA) return clicksB - clicksA;

      const impressionsA = statsA?.impressions ?? 0;
      const impressionsB = statsB?.impressions ?? 0;
      if (impressionsB !== impressionsA) return impressionsB - impressionsA;

      return a.title.localeCompare(b.title, "sv");
    })
    .slice(0, limit);
}

/**
 * Fail-soft on RPC errors/timeouts: return {} so SSG/ISR never hangs or
 * fails the build when Supabase is slow (e.g. preview against prod before
 * migration 318). Popular-producer order falls back to title sort via
 * pickTopCollectionsByCtr. Snapshot RPC keeps the happy path a cheap jsonb
 * read; empty is only a degraded fallback. Client abort + single-flight
 * caps wait well below Next's 60s page export budget.
 */
const loadProducerCtrRecord = createFailSoftLoader({
  label: "producer-ctr",
  empty: {} as Record<string, ProducerCtrStats>,
  load: async (signal) => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .rpc("analytics_producer_ctr_aggregates", {
        p_lookback_days: DEFAULT_LOOKBACK_DAYS,
      })
      .abortSignal(signal);

    if (error) {
      throw new Error(error.message);
    }

    return normalizeProducerCtrRecord(data);
  },
});

const getCachedProducerCtrRecord = unstable_cache(
  loadProducerCtrRecord,
  ["producer-ctr-30d-rpc"],
  { revalidate: 3600 },
);

/** CTR per producer id for the last 30 days. Cached across requests. */
export const getProducerCtrById = cache(
  async (): Promise<Map<string, ProducerCtrStats>> => {
    try {
      return producerCtrFromRecord(await getCachedProducerCtrRecord());
    } catch (error) {
      console.warn("[producer-ctr]", error);
      return new Map();
    }
  },
);

export async function pickPopularProducerCollections<
  T extends { id: string; handle: string; title: string },
>(collections: T[], limit = POPULAR_PRODUCER_LIMIT): Promise<T[]> {
  const stats = await getProducerCtrById();
  return pickTopCollectionsByCtr(collections, stats, limit);
}
