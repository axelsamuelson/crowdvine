/**
 * Analytics V2 server query helpers over analytics_daily_rollup.
 * Rollup already stores clean (non-prerender) session counts.
 * Site filter is always required (pact|dirtywine).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  stockholmWeekStartKey,
  eachDateKeyInclusive,
} from "@/lib/analytics/stockholm-time";
import type { AnalyticsV2FilterState } from "@/lib/analytics/v2/filters";

export type RollupRow = {
  day_sthlm: string;
  site: string;
  market: string;
  channel: string;
  device: string;
  landing_type: string;
  is_invited_friend: boolean;
  sessions: number;
  engaged: number;
  plp: number;
  pdp: number;
  cart: number;
  checkout: number;
  purchases: number;
  purchase_value_sek: number | string;
  prerender_suspect: number;
  refreshed_at: string | null;
};

/** Public totals shape (snake + camel for purchase value). */
export type RollupTotals = {
  sessions: number;
  engaged: number;
  plp: number;
  pdp: number;
  cart: number;
  checkout: number;
  purchases: number;
  purchase_value_sek: number;
  purchaseValueSek: number;
  prerender_suspect: number;
};

export type StatusLine = {
  beforeFilter: number;
  afterFilter: number;
  prerenderSuspect: number;
  lastRefreshAt: string | null;
  warnings: string[];
};

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
};

export type SessionFunnel = {
  totals: RollupTotals;
  steps: FunnelStep[];
  rates: {
    engaged: number | null;
    plp: number | null;
    pdp: number | null;
    cart: number | null;
    checkout: number | null;
    purchases: number | null;
  };
};

export type TimeSeriesPoint = {
  /** Bucket key (day / ISO-week Monday / YYYY-MM). Also exposed as `day` for UI. */
  bucket: string;
  day: string;
  sessions: number;
  engaged: number;
  plp: number;
  pdp: number;
  cart: number;
  checkout: number;
  purchases: number;
  purchase_value_sek: number;
};

export type AnnotationRow = {
  id: string;
  date: string;
  occurred_at: string | null;
  label: string;
  category: string;
  site: string | null;
  source: string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyTotals(): RollupTotals {
  return {
    sessions: 0,
    engaged: 0,
    plp: 0,
    pdp: 0,
    cart: 0,
    checkout: 0,
    purchases: 0,
    purchase_value_sek: 0,
    purchaseValueSek: 0,
    prerender_suspect: 0,
  };
}

function sumRows(rows: RollupRow[]): RollupTotals {
  const t = emptyTotals();
  for (const r of rows) {
    t.sessions += num(r.sessions);
    t.engaged += num(r.engaged);
    t.plp += num(r.plp);
    t.pdp += num(r.pdp);
    t.cart += num(r.cart);
    t.checkout += num(r.checkout);
    t.purchases += num(r.purchases);
    t.purchase_value_sek += num(r.purchase_value_sek);
    t.prerender_suspect += num(r.prerender_suspect);
  }
  t.purchaseValueSek = t.purchase_value_sek;
  return t;
}

function rate(numera: number, den: number): number | null {
  if (den <= 0) return null;
  return numera / den;
}

/**
 * Apply shared dimension filters. Invited (etapp 1):
 * include = all rows, exclude = is_invited_friend=false.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRollupFilters(query: any, filters: AnalyticsV2FilterState) {
  let q = query
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to);

  if (filters.market === "SE") {
    q = q.eq("market", "SE");
  } else if (filters.market === "other") {
    q = q.eq("market", "other");
  } else if (filters.market === "unknown") {
    q = q.eq("market", "unknown");
  } else if (filters.market !== "all") {
    q = q.eq("market", filters.market);
  }

  if (filters.channel) q = q.eq("channel", filters.channel);
  if (filters.device) q = q.eq("device", filters.device);

  if (filters.invited === "exclude") {
    q = q.eq("is_invited_friend", false);
  }

  return q;
}

/**
 * Shared clean-session filters for analytics_session_facts queries.
 * Invited exclude + soft bot flags (prerender / geo).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyCleanFactsFilters(query: any, filters: AnalyticsV2FilterState) {
  let q = query
    .eq("site", filters.site)
    .gte("day_sthlm", filters.from)
    .lte("day_sthlm", filters.to)
    .eq("is_clean", true)
    .eq("is_prerender_suspect", false)
    .eq("is_geo_bot_suspect", false);

  if (filters.channel) q = q.eq("channel", filters.channel);
  if (filters.device) q = q.eq("device", filters.device);
  if (filters.invited === "exclude") {
    q = q.eq("is_invited_friend", false);
  }
  if (filters.market === "SE") {
    q = q.eq("country_code", "SE");
  } else if (filters.market === "unknown") {
    q = q.is("country_code", null);
  } else if (filters.market === "other") {
    q = q.neq("country_code", "SE").not("country_code", "is", null);
  } else if (filters.market !== "all") {
    q = q.eq("country_code", filters.market);
  }

  return q;
}

async function fetchRollupRows(
  filters: AnalyticsV2FilterState,
): Promise<RollupRow[]> {
  const sb = getSupabaseAdmin();
  const base = sb
    .from("analytics_daily_rollup")
    .select(
      "day_sthlm, site, market, channel, device, landing_type, is_invited_friend, sessions, engaged, plp, pdp, cart, checkout, purchases, purchase_value_sek, prerender_suspect, refreshed_at",
    );
  const q = applyRollupFilters(base, filters);
  const { data, error } = await q;
  if (error) {
    throw new Error(`analytics_daily_rollup: ${error.message}`);
  }
  return (data ?? []) as RollupRow[];
}

export async function fetchRollupTotals(
  filters: AnalyticsV2FilterState,
): Promise<RollupTotals> {
  const rows = await fetchRollupRows(filters);
  return sumRows(rows);
}

/**
 * Open funnel (default, spec §6.2 / Shopify): each step is independent —
 * sticky ATC / cart drawer can skip earlier steps, so Kassa may exceed Varukorg.
 * Closed funnel: each step requires all prior steps (subset chain).
 */
export type FunnelMode = "open" | "closed";

export async function fetchSessionFunnel(
  filters: AnalyticsV2FilterState,
  mode: FunnelMode = "open",
): Promise<SessionFunnel & { mode: FunnelMode; note: string }> {
  const openNote =
    "Öppen tratt: varje steg räknas oberoende mot rena sessioner. Sticky köpknapp och varukorgslåda kan hoppa över tidigare steg — Kassa kan därför vara större än La i varukorg. Event: add_to_cart → checkout_started|checkout_step_viewed.";
  const closedNote =
    "Stängd tratt: varje steg kräver alla föregående (delmängd). Sessioner som går direkt till kassa utan add_to_cart räknas inte i kassa-steget.";

  if (mode === "closed") {
    const closed = await fetchClosedFunnelCounts(filters);
    const steps: FunnelStep[] = [
      { key: "sessions", label: "Sessioner", count: closed.sessions },
      { key: "engaged", label: "Engagerade", count: closed.engaged },
      { key: "plp", label: "Produktlista", count: closed.plp },
      { key: "pdp", label: "Produktsida", count: closed.pdp },
      { key: "cart", label: "La i varukorg", count: closed.cart },
      { key: "checkout", label: "Påbörjade kassan", count: closed.checkout },
      { key: "purchases", label: "Slutförda köp", count: closed.purchases },
    ];
    return {
      mode,
      note: closedNote,
      totals: {
        sessions: closed.sessions,
        engaged: closed.engaged,
        plp: closed.plp,
        pdp: closed.pdp,
        cart: closed.cart,
        checkout: closed.checkout,
        purchases: closed.purchases,
        purchase_value_sek: 0,
        purchaseValueSek: 0,
        prerender_suspect: 0,
      },
      steps,
      rates: {
        engaged: rate(closed.engaged, closed.sessions),
        plp: rate(closed.plp, closed.sessions),
        pdp: rate(closed.pdp, closed.sessions),
        cart: rate(closed.cart, closed.sessions),
        checkout: rate(closed.checkout, closed.sessions),
        purchases: rate(closed.purchases, closed.sessions),
      },
    };
  }

  const totals = await fetchRollupTotals(filters);
  const steps: FunnelStep[] = [
    { key: "sessions", label: "Sessioner", count: totals.sessions },
    { key: "engaged", label: "Engagerade", count: totals.engaged },
    { key: "plp", label: "Produktlista", count: totals.plp },
    { key: "pdp", label: "Produktsida", count: totals.pdp },
    { key: "cart", label: "La i varukorg", count: totals.cart },
    { key: "checkout", label: "Påbörjade kassan", count: totals.checkout },
    { key: "purchases", label: "Slutförda köp", count: totals.purchases },
  ];
  return {
    mode: "open",
    note: openNote,
    totals,
    steps,
    rates: {
      engaged: rate(totals.engaged, totals.sessions),
      plp: rate(totals.plp, totals.sessions),
      pdp: rate(totals.pdp, totals.sessions),
      cart: rate(totals.cart, totals.sessions),
      checkout: rate(totals.checkout, totals.sessions),
      purchases: rate(totals.purchases, totals.sessions),
    },
  };
}

/** Closed-funnel counts from facts (full prior-step chain). */
async function fetchClosedFunnelCounts(filters: AnalyticsV2FilterState) {
  const sb = getSupabaseAdmin();
  const base = applyCleanFactsFilters(
    sb
      .from("analytics_session_facts")
      .select(
        "is_engaged, reached_plp, reached_pdp, added_to_cart, reached_checkout, purchased",
      ),
    filters,
  );
  const { data, error } = await base.limit(50000);
  if (error) {
    throw new Error(`closed funnel facts: ${error.message}`);
  }
  let sessions = 0;
  let engaged = 0;
  let plp = 0;
  let pdp = 0;
  let cart = 0;
  let checkout = 0;
  let purchases = 0;
  for (const row of data ?? []) {
    sessions += 1;
    const eng = Boolean(row.is_engaged);
    const rPlp = eng && Boolean(row.reached_plp);
    const rPdp = rPlp && Boolean(row.reached_pdp);
    const rCart = rPdp && Boolean(row.added_to_cart);
    const rCheck = rCart && Boolean(row.reached_checkout);
    const rBuy = rCheck && Boolean(row.purchased);
    if (eng) engaged += 1;
    if (rPlp) plp += 1;
    if (rPdp) pdp += 1;
    if (rCart) cart += 1;
    if (rCheck) checkout += 1;
    if (rBuy) purchases += 1;
  }
  return { sessions, engaged, plp, pdp, cart, checkout, purchases };
}

export async function fetchStatusLine(
  filters: AnalyticsV2FilterState,
): Promise<StatusLine> {
  const rows = await fetchRollupRows(filters);
  const totals = sumRows(rows);
  const afterFilter = totals.sessions;
  const prerenderSuspect = totals.prerender_suspect;
  const beforeFilter = afterFilter + prerenderSuspect;

  let lastRefreshAt: string | null = null;
  for (const r of rows) {
    if (!r.refreshed_at) continue;
    if (!lastRefreshAt || r.refreshed_at > lastRefreshAt) {
      lastRefreshAt = r.refreshed_at;
    }
  }

  if (!lastRefreshAt) {
    try {
      const sb = getSupabaseAdmin();
      const { data } = await sb
        .from("analytics_refresh_state")
        .select("last_refresh_at")
        .eq("id", "default")
        .maybeSingle();
      lastRefreshAt =
        (data as { last_refresh_at?: string | null } | null)?.last_refresh_at ??
        null;
    } catch {
      // ignore
    }
  }

  const warnings: string[] = [];
  if (prerenderSuspect > 0) {
    warnings.push(
      `${prerenderSuspect} förhandsladdningar bortfiltrerade (D1-regel)`,
    );
  }

  return {
    beforeFilter,
    afterFilter,
    prerenderSuspect,
    lastRefreshAt,
    warnings,
  };
}

function monthBucket(dayKey: string): string {
  return dayKey.slice(0, 7);
}

function bucketKey(
  dayKey: string,
  grain: AnalyticsV2FilterState["grain"],
): string {
  if (grain === "day") return dayKey;
  if (grain === "week") return stockholmWeekStartKey(dayKey);
  return monthBucket(dayKey);
}

export async function fetchTimeSeries(
  filters: AnalyticsV2FilterState,
): Promise<TimeSeriesPoint[]> {
  const rows = await fetchRollupRows(filters);
  const byBucket = new Map<string, TimeSeriesPoint>();

  for (const day of eachDateKeyInclusive(filters.from, filters.to)) {
    const b = bucketKey(day, filters.grain);
    if (!byBucket.has(b)) {
      byBucket.set(b, {
        bucket: b,
        day: b,
        sessions: 0,
        engaged: 0,
        plp: 0,
        pdp: 0,
        cart: 0,
        checkout: 0,
        purchases: 0,
        purchase_value_sek: 0,
      });
    }
  }

  for (const r of rows) {
    const b = bucketKey(r.day_sthlm, filters.grain);
    let point = byBucket.get(b);
    if (!point) {
      point = {
        bucket: b,
        day: b,
        sessions: 0,
        engaged: 0,
        plp: 0,
        pdp: 0,
        cart: 0,
        checkout: 0,
        purchases: 0,
        purchase_value_sek: 0,
      };
      byBucket.set(b, point);
    }
    point.sessions += num(r.sessions);
    point.engaged += num(r.engaged);
    point.plp += num(r.plp);
    point.pdp += num(r.pdp);
    point.cart += num(r.cart);
    point.checkout += num(r.checkout);
    point.purchases += num(r.purchases);
    point.purchase_value_sek += num(r.purchase_value_sek);
  }

  return [...byBucket.values()].sort((a, b) =>
    a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0,
  );
}

export async function fetchAnnotations(
  from: string,
  to: string,
): Promise<{ annotations: AnnotationRow[]; error: string | null }> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("admin_analytics_annotations")
      .select("id, date, occurred_at, label, category, site, source")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .limit(200);

    if (error) {
      return { annotations: [], error: error.message };
    }

    return {
      annotations: (data ?? []) as AnnotationRow[],
      error: null,
    };
  } catch (e) {
    return {
      annotations: [],
      error: e instanceof Error ? e.message : "Kunde inte hämta anteckningar",
    };
  }
}

/** @internal test helper — sum without DB */
export function __sumRollupRowsForTests(rows: RollupRow[]): RollupTotals {
  return sumRows(rows);
}
