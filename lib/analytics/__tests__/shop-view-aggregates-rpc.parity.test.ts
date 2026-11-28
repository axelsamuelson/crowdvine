/**
 * Parity: JS aggregators vs SQL RPCs on synthetic rows in TEST only.
 * Skips unless NEXT_PUBLIC_SUPABASE_URL points at msdfjrrokcmjifetuwgc.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { aggregateProducerCtr } from "../producer-ctr";
import { aggregateWineViewStats } from "../product-view-stats";

const TEST_REF = "msdfjrrokcmjifetuwgc";
const MARKER = "perf_user_events_v1_parity";
const LOOKBACK_DAYS = 30;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const isTestDb = supabaseUrl.includes(TEST_REF);

const producerA = "perf-producer-a";
const producerB = "perf-producer-b";
const wine1 = "perf-wine-1";
const wine2 = "perf-wine-2";

const syntheticEvents = [
  {
    session_id: `${MARKER}-s1`,
    event_type: "product_list_viewed",
    event_category: "engagement",
    event_name: "product_list_viewed",
    event_metadata: {
      _test: MARKER,
      producerIds: [producerA, producerB, producerA],
      productIds: [wine1, wine2, wine1],
    },
  },
  {
    session_id: `${MARKER}-s2`,
    event_type: "product_list_viewed",
    event_category: "engagement",
    event_name: "product_list_viewed",
    event_metadata: {
      _test: MARKER,
      producerIds: [producerB],
      productIds: [wine2],
    },
  },
  {
    session_id: `${MARKER}-s3`,
    event_type: "product_viewed",
    event_category: "engagement",
    event_name: "product_viewed",
    event_metadata: {
      _test: MARKER,
      producerId: producerA,
      productId: wine1,
    },
  },
  {
    session_id: `${MARKER}-s4`,
    event_type: "product_viewed",
    event_category: "engagement",
    event_name: "product_viewed",
    event_metadata: {
      _test: MARKER,
      producerId: producerB,
      productId: wine2,
    },
  },
  {
    session_id: `${MARKER}-s5`,
    event_type: "product_viewed",
    event_category: "engagement",
    event_name: "product_viewed",
    event_metadata: {
      _test: MARKER,
      producerId: producerB,
      productId: wine2,
    },
  },
];

describe.skipIf(!isTestDb || !serviceKey)(
  "shop view aggregate RPCs vs JS (TEST)",
  () => {
    let sb: SupabaseClient;
    let insertedIds: string[] = [];

    beforeAll(async () => {
      sb = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Clean any leftover synthetic rows from a prior interrupted run.
      await sb
        .from("user_events")
        .delete()
        .contains("event_metadata", { _test: MARKER });

      const { data, error } = await sb
        .from("user_events")
        .insert(syntheticEvents)
        .select("id");
      if (error) throw error;
      insertedIds = (data ?? []).map((row) => row.id as string);
      expect(insertedIds.length).toBe(syntheticEvents.length);
    });

    afterAll(async () => {
      if (!sb || insertedIds.length === 0) return;
      await sb.from("user_events").delete().in("id", insertedIds);
    });

    it("matches producer CTR aggregation", async () => {
      const js = aggregateProducerCtr(syntheticEvents);
      const { data, error } = await sb.rpc("analytics_producer_ctr_aggregates", {
        p_lookback_days: LOOKBACK_DAYS,
      });
      if (error) throw error;

      const rpc = data as Record<
        string,
        { impressions: number; clicks: number; ctr: number }
      >;

      for (const id of [producerA, producerB]) {
        const expected = js.get(id)!;
        expect(rpc[id]?.impressions).toBe(expected.impressions);
        expect(rpc[id]?.clicks).toBe(expected.clicks);
        expect(rpc[id]?.ctr).toBeCloseTo(expected.ctr, 10);
      }
    });

    it("matches per-wine PLP/PDP aggregation", async () => {
      const js = aggregateWineViewStats(syntheticEvents);
      const { data, error } = await sb.rpc("analytics_product_view_aggregates", {
        p_lookback_days: LOOKBACK_DAYS,
      });
      if (error) throw error;

      const rpc = data as Record<
        string,
        { plpViews: number; pdpViews: number; conversionRate: number }
      >;

      for (const id of [wine1, wine2]) {
        const expected = js.get(id)!;
        expect(rpc[id]?.plpViews).toBe(expected.plpViews);
        expect(rpc[id]?.pdpViews).toBe(expected.pdpViews);
        expect(rpc[id]?.conversionRate).toBeCloseTo(expected.conversionRate, 10);
      }
    });
  },
);
