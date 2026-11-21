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
  geoBotSuspect: number;
  lastRefreshAt: string | null;
  warnings: string[];
};

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  /** Share of all sessions (0–1). */
  ofSessions: number | null;
  /** Share of previous step (0–1). */
  ofPrevious: number | null;
  /** Previous-step count (denominator for ofPrevious). */
  ofPreviousDen: number | null;
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

/** RPC filter args — null means «all» for that dimension. */
function rpcFilterArgs(filters: AnalyticsV2FilterState) {
  return {
    p_site: filters.site,
    p_from: filters.from,
    p_to: filters.to,
    p_market: filters.market === "all" ? null : filters.market,
    p_channel: filters.channel,
    p_device: filters.device,
    p_invited: filters.invited === "exclude" ? "exclude" : "include",
  };
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

/** Paginate rollup rows (PostgREST max-rows is often 1000). */
async function fetchRollupRows(
  filters: AnalyticsV2FilterState,
): Promise<RollupRow[]> {
  const sb = getSupabaseAdmin();
  const pageSize = 1000;
  const all: RollupRow[] = [];
  for (let from = 0; from < 50_000; from += pageSize) {
    const base = sb
      .from("analytics_daily_rollup")
      .select(
        "day_sthlm, site, market, channel, device, landing_type, is_invited_friend, sessions, engaged, plp, pdp, cart, checkout, purchases, purchase_value_sek, prerender_suspect, refreshed_at",
      );
    const q = applyRollupFilters(base, filters).range(
      from,
      from + pageSize - 1,
    );
    const { data, error } = await q;
    if (error) {
      throw new Error(`analytics_daily_rollup: ${error.message}`);
    }
    const batch = (data ?? []) as RollupRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

export async function fetchRollupTotals(
  filters: AnalyticsV2FilterState,
): Promise<RollupTotals> {
  const sb = getSupabaseAdmin();
  const args = rpcFilterArgs(filters);
  const { data, error } = await sb.rpc("analytics_v2_rpc_rollup_totals", args);
  if (error) {
    // Fallback for environments where 308 is not applied yet.
    const rows = await fetchRollupRows(filters);
    return sumRows(rows);
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  const purchase = num(raw.purchase_value_sek as number);
  return {
    sessions: num(raw.sessions as number),
    engaged: num(raw.engaged as number),
    plp: num(raw.plp as number),
    pdp: num(raw.pdp as number),
    cart: num(raw.cart as number),
    checkout: num(raw.checkout as number),
    purchases: num(raw.purchases as number),
    purchase_value_sek: purchase,
    purchaseValueSek: purchase,
    prerender_suspect: num(raw.prerender_suspect as number),
  };
}

export async function fetchGroupedDimension(
  dim: "channel" | "market",
  filters: AnalyticsV2FilterState,
): Promise<
  Array<{
    key: string;
    sessions: number;
    engaged: number;
    plp: number;
    pdp: number;
    cart: number;
    checkout: number;
    purchases: number;
  }>
> {
  const sb = getSupabaseAdmin();
  const args = { p_dim: dim, ...rpcFilterArgs(filters) };
  const { data, error } = await sb.rpc("analytics_v2_rpc_group_by", args);
  if (error) {
    throw new Error(`analytics_v2_rpc_group_by: ${error.message}`);
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      key: String(row.key ?? row[dim] ?? "unknown"),
      sessions: num(row.sessions as number),
      engaged: num(row.engaged as number),
      plp: num(row.plp as number),
      pdp: num(row.pdp as number),
      cart: num(row.cart as number),
      checkout: num(row.checkout as number),
      purchases: num(row.purchases as number),
    };
  });
}

export async function fetchCheckoutStepCounts(
  filters: AnalyticsV2FilterState,
): Promise<Record<string, number>> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc(
    "analytics_v2_rpc_checkout_steps",
    rpcFilterArgs(filters),
  );
  if (error) {
    throw new Error(`analytics_v2_rpc_checkout_steps: ${error.message}`);
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    postal: num(raw.postal as number),
    delivery: num(raw.delivery as number),
    age_terms: num(raw.age_terms as number),
    payment: num(raw.payment as number),
  };
}

/**
 * Open funnel (default): each step independent — kassa may exceed varukorg.
 * Closed funnel: 6 time-ordered steps without Engagerad as a required prior.
 */
export type FunnelMode = "open" | "closed";

function buildFunnelSteps(
  counts: Array<{ key: string; label: string; count: number }>,
): FunnelStep[] {
  const sessions = counts[0]?.count ?? 0;
  return counts.map((c, i) => {
    const prev = i === 0 ? null : counts[i - 1]!.count;
    return {
      key: c.key,
      label: c.label,
      count: c.count,
      ofSessions: rate(c.count, sessions),
      ofPrevious: prev == null ? null : rate(c.count, prev),
      ofPreviousDen: prev,
    };
  });
}

export async function fetchSessionFunnel(
  filters: AnalyticsV2FilterState,
  mode: FunnelMode = "open",
): Promise<SessionFunnel & { mode: FunnelMode; note: string }> {
  const openNote =
    "Varje steg räknas för sig mot rena besök. Kassan kan vara större än varukorgen, eftersom man kan gå direkt till kassan.";
  const closedNote =
    "Stängd tratt: besöket måste ha nått varje steg (lista → produkt → varukorg → kassa → köp). Ordning och återbesök spelar ingen roll.";

  if (mode === "closed") {
    const closed = await fetchClosedFunnelCounts(filters);
    const steps = buildFunnelSteps([
      { key: "sessions", label: "Besök", count: closed.sessions },
      { key: "plp", label: "Produktlista", count: closed.plp },
      { key: "pdp", label: "Produktsida", count: closed.pdp },
      { key: "cart", label: "Lade i varukorg", count: closed.cart },
      { key: "checkout", label: "Började i kassan", count: closed.checkout },
      { key: "purchases", label: "Slutförda köp", count: closed.purchases },
    ]);
    return {
      mode,
      note: closedNote,
      totals: {
        sessions: closed.sessions,
        engaged: 0,
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
        engaged: null,
        plp: rate(closed.plp, closed.sessions),
        pdp: rate(closed.pdp, closed.sessions),
        cart: rate(closed.cart, closed.sessions),
        checkout: rate(closed.checkout, closed.sessions),
        purchases: rate(closed.purchases, closed.sessions),
      },
    };
  }

  const totals = await fetchRollupTotals(filters);
  const steps = buildFunnelSteps([
    { key: "sessions", label: "Besök", count: totals.sessions },
    { key: "engaged", label: "Engagerade", count: totals.engaged },
    { key: "plp", label: "Produktlista", count: totals.plp },
    { key: "pdp", label: "Produktsida", count: totals.pdp },
    { key: "cart", label: "Lade i varukorg", count: totals.cart },
    { key: "checkout", label: "Började i kassan", count: totals.checkout },
    { key: "purchases", label: "Slutförda köp", count: totals.purchases },
  ]);
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

/** Closed funnel via SQL RPC (time-ordered, no Engagerad prior). */
async function fetchClosedFunnelCounts(filters: AnalyticsV2FilterState) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc(
    "analytics_v2_rpc_closed_funnel",
    rpcFilterArgs(filters),
  );
  if (error) {
    throw new Error(`closed funnel: ${error.message}`);
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    sessions: num(raw.sessions as number),
    plp: num(raw.plp as number),
    pdp: num(raw.pdp as number),
    cart: num(raw.cart as number),
    checkout: num(raw.checkout as number),
    purchases: num(raw.purchases as number),
  };
}

export async function fetchStatusLine(
  filters: AnalyticsV2FilterState,
): Promise<StatusLine> {
  const totals = await fetchRollupTotals(filters);
  const afterFilter = totals.sessions;
  const prerenderSuspect = totals.prerender_suspect;

  let lastRefreshAt: string | null = null;
  let geoBotSuspect = 0;
  /** Spec: denominator = all sessions before bot/prerender filter. */
  let beforeFilter = afterFilter + prerenderSuspect;
  try {
    const sb = getSupabaseAdmin();
    const { count: allCount } = await sb
      .from("analytics_session_facts")
      .select("session_id", { count: "exact", head: true })
      .eq("site", filters.site)
      .gte("day_sthlm", filters.from)
      .lte("day_sthlm", filters.to);
    if (allCount != null) {
      beforeFilter = allCount;
    }
    const { count: geoCount } = await sb
      .from("analytics_session_facts")
      .select("session_id", { count: "exact", head: true })
      .eq("site", filters.site)
      .gte("day_sthlm", filters.from)
      .lte("day_sthlm", filters.to)
      .eq("is_geo_bot_suspect", true);
    geoBotSuspect = geoCount ?? 0;
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

  const warnings: string[] = [];
  if (prerenderSuspect > 0) {
    warnings.push(
      `${prerenderSuspect} förhandsladdningar bortfiltrerade`,
    );
  }

  return {
    beforeFilter,
    afterFilter,
    prerenderSuspect,
    geoBotSuspect,
    lastRefreshAt,
    warnings,
  };
}

export type ProductWineRow = {
  product_id: string;
  product_name: string | null;
  list_sessions: number;
  pdp_sessions: number;
  cart_sessions: number;
  checkout_sessions: number;
  purchase_sessions: number;
};

export async function fetchProductsReport(
  filters: AnalyticsV2FilterState,
): Promise<{
  wines: ProductWineRow[];
  lists: Array<{ path: string; sessions: number }>;
  unattributedPdp: number;
}> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc(
    "analytics_v2_rpc_products",
    rpcFilterArgs(filters),
  );
  if (error) {
    throw new Error(`analytics_v2_rpc_products: ${error.message}`);
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  const winesRaw = Array.isArray(raw.wines) ? raw.wines : [];
  const listsRaw = Array.isArray(raw.lists) ? raw.lists : [];
  return {
    wines: winesRaw.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        product_id: String(row.product_id ?? ""),
        product_name: (row.product_name as string | null) ?? null,
        list_sessions: num(row.list_sessions as number),
        pdp_sessions: num(row.pdp_sessions as number),
        cart_sessions: num(row.cart_sessions as number),
        checkout_sessions: num(row.checkout_sessions as number),
        purchase_sessions: num(row.purchase_sessions as number),
      };
    }),
    lists: listsRaw.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        path: String(row.path ?? "/"),
        sessions: num(row.sessions as number),
      };
    }),
    unattributedPdp: num(raw.unattributed_pdp as number),
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
