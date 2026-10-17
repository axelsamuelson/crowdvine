import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getExcludedProfileIds,
  isExcludedUserId,
} from "@/lib/analytics/excluded-profile-ids";

/** How many names Popular Producers shows. */
export const POPULAR_PRODUCER_LIMIT = 5;

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_EVENTS = 5000;

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

async function loadProducerCtrRecord(): Promise<Record<string, ProducerCtrStats>> {
  const sb = getSupabaseAdmin();
  const since = new Date(
    Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
  const excluded = await getExcludedProfileIds(sb);

  const { data: events, error } = await sb
    .from("user_events")
    .select("event_type, event_metadata, user_id, created_at")
    .in("event_type", ["product_list_viewed", "product_viewed"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_EVENTS);

  if (error) {
    console.warn("[producer-ctr]", error.message);
    return {};
  }

  const included = (events ?? []).filter(
    (event) => !isExcludedUserId(event.user_id as string | null, excluded),
  );
  const stats = aggregateProducerCtr(included);
  return Object.fromEntries(stats);
}

const getCachedProducerCtrRecord = unstable_cache(
  loadProducerCtrRecord,
  ["producer-ctr-30d"],
  { revalidate: 300 },
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
