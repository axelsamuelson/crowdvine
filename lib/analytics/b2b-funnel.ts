/**
 * Dirty Wine B2B funnel aggregation (week-by-week from reliable analytics cutoff).
 *
 * Steps: contact → inquiry_started → inquiry_submitted (conversion) →
 * tasting/quote → first order → repeat (is_first_order=false).
 */
import { stockholmWeekStartKey } from "@/lib/analytics/stockholm-time";
import { analyticsSite } from "@/lib/analytics/analytics-site";

/** Reliable analytics window (AGENTS.md / product decision). */
export const B2B_FUNNEL_SINCE = "2026-08-07";

/** Funnel conversion event for Dirty Wine inquiry flow. */
export const B2B_FUNNEL_CONVERSION_EVENT = "b2b_inquiry_submitted" as const;

export type B2bFunnelEventRow = {
  event_type: string;
  event_metadata: unknown;
  created_at: string;
  page_url?: string | null;
  session_id?: string | null;
};

export type B2bWeeklyFunnelRow = {
  week_start: string;
  contact_clicked: number;
  inquiry_started: number;
  /** Conversion step. */
  inquiry_submitted: number;
  tasting_or_quote: number;
  first_orders: number;
  repeat_orders: number;
};

function asMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isFirstOrderMeta(meta: Record<string, unknown>): boolean {
  return meta.is_first_order === true;
}

/**
 * Fill continuous Stockholm weeks from B2B_FUNNEL_SINCE through the current week.
 */
export function buildB2bWeeklyFunnel(
  events: B2bFunnelEventRow[],
  now: Date = new Date(),
): B2bWeeklyFunnelRow[] {
  const sinceMs = new Date(`${B2B_FUNNEL_SINCE}T00:00:00.000Z`).getTime();
  const byWeek = new Map<
    string,
    {
      contact: number;
      inquiryStarted: number;
      inquirySubmitted: number;
      tastingQuote: number;
      first: number;
      repeat: number;
    }
  >();

  const ensure = (key: string) => {
    let b = byWeek.get(key);
    if (!b) {
      b = {
        contact: 0,
        inquiryStarted: 0,
        inquirySubmitted: 0,
        tastingQuote: 0,
        first: 0,
        repeat: 0,
      };
      byWeek.set(key, b);
    }
    return b;
  };

  for (const e of events) {
    const t = new Date(e.created_at).getTime();
    if (!Number.isFinite(t) || t < sinceMs) continue;
    if (e.page_url) {
      const site = analyticsSite(e.page_url);
      if (site && site !== "dirtywine") continue;
    }
    const week = stockholmWeekStartKey(e.created_at);
    if (!week || week < stockholmWeekStartKey(B2B_FUNNEL_SINCE)) continue;
    const bucket = ensure(week);
    const meta = asMeta(e.event_metadata);

    switch (e.event_type) {
      case "b2b_contact_clicked":
        bucket.contact += 1;
        break;
      case "b2b_inquiry_started":
        bucket.inquiryStarted += 1;
        break;
      case "b2b_inquiry_submitted":
        bucket.inquirySubmitted += 1;
        break;
      case "b2b_tasting_requested":
      case "b2b_quote_sent":
        bucket.tastingQuote += 1;
        break;
      case "b2b_order_created":
        if (isFirstOrderMeta(meta)) bucket.first += 1;
        else bucket.repeat += 1;
        break;
      default:
        break;
    }
  }

  const result: B2bWeeklyFunnelRow[] = [];
  const currentWeek = stockholmWeekStartKey(now.toISOString());
  const startWeek = stockholmWeekStartKey(B2B_FUNNEL_SINCE);
  if (!currentWeek || !startWeek) return result;

  let cursor = startWeek;
  for (let guard = 0; guard < 520; guard++) {
    const b = byWeek.get(cursor);
    result.push({
      week_start: cursor,
      contact_clicked: b?.contact ?? 0,
      inquiry_started: b?.inquiryStarted ?? 0,
      inquiry_submitted: b?.inquirySubmitted ?? 0,
      tasting_or_quote: b?.tastingQuote ?? 0,
      first_orders: b?.first ?? 0,
      repeat_orders: b?.repeat ?? 0,
    });
    if (cursor >= currentWeek) break;
    const d = new Date(`${cursor}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    cursor = d.toISOString().slice(0, 10);
  }
  return result;
}
