import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { EventCategory, EventType } from "./event-tracker";
import type { FirstTouch } from "./visitor-identity";

function isLikelyBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (ua === "server") return false;
  return /bot|crawl|spider|headless|lighthouse|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|outbrain|pinterest|vkshare|preview/i.test(
    ua,
  );
}

/**
 * Insert into user_events from API routes (no browser session).
 * Uses a synthetic session_id; omit PII from metadata.
 * Prefer passing visitorId / firstTouch from the browser when available.
 *
 * Tags `internal` and `likely_bot` on ALL events when applicable.
 * Attaches first_touch + visitor flags whenever provided.
 */
export async function logUserEventServer(opts: {
  userId?: string | null;
  visitorId?: string | null;
  /** ISO 3166-1 alpha-2 from pact_geo_country cookie. Never store IP. */
  countryCode?: string | null;
  eventType: EventType;
  eventCategory: EventCategory;
  metadata?: Record<string, unknown>;
  firstTouch?: FirstTouch | null;
  /** Caller already resolved internal (client flag / test purchase / etc.). */
  internal?: boolean;
  userAgent?: string | null;
  pageUrl?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  /** When known: visitor had prior first-touch attribution. */
  isReturningVisitor?: boolean;
}): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    let metadata: Record<string, unknown> = { ...(opts.metadata ?? {}) };
    const visitorId = opts.visitorId?.trim() || null;
    const countryRaw = opts.countryCode?.trim().toUpperCase() || null;
    const countryCode =
      countryRaw && /^[A-Z]{2}$/.test(countryRaw) && countryRaw !== "XX"
        ? countryRaw
        : null;
    const userAgent = opts.userAgent?.trim() || "server";

    if (opts.firstTouch) {
      metadata = { ...metadata, first_touch: opts.firstTouch };
    }
    if (visitorId) {
      metadata = { ...metadata, visitor_id: visitorId };
    }
    if (opts.isReturningVisitor != null) {
      metadata = {
        ...metadata,
        is_returning_visitor: opts.isReturningVisitor,
        is_new_visitor: !opts.isReturningVisitor,
        visitor_status: opts.isReturningVisitor ? "returning" : "new",
      };
    }

    let internal = opts.internal === true || metadata.internal === true;
    if (!internal && opts.userId) {
      const { data: excl } = await sb
        .from("admin_metrics_excluded_profiles")
        .select("profile_id")
        .eq("profile_id", opts.userId)
        .maybeSingle();
      if (excl?.profile_id) {
        internal = true;
      }
    }
    if (internal) {
      metadata = { ...metadata, internal: true };
    }

    if (
      metadata.likely_bot !== true &&
      isLikelyBotUserAgent(userAgent)
    ) {
      metadata = { ...metadata, likely_bot: true };
    }

    const row = {
      user_id: opts.userId ?? null,
      session_id: opts.sessionId?.trim() || `server_${randomUUID()}`,
      visitor_id: visitorId,
      country_code: countryCode,
      event_type: opts.eventType,
      event_category: opts.eventCategory,
      event_metadata: metadata,
      page_url: opts.pageUrl ?? null,
      referrer: opts.referrer ?? null,
      user_agent: userAgent,
    };

    await sb
      .from("user_events")
      .insert(row)
      .then(({ error }) => {
        if (!error) return;
        if (
          !/visitor_id|country_code|schema cache|Could not find/i.test(
            error.message || "",
          )
        ) {
          console.error("logUserEventServer:", error.message);
          return;
        }
        // Pre-migration fallback
        const { visitor_id: _v, country_code: _c, ...withoutNew } = row;
        void sb.from("user_events").insert({
          ...withoutNew,
          session_id: opts.sessionId?.trim() || `server_${randomUUID()}`,
        });
      });
  } catch (e) {
    console.error("logUserEventServer:", e);
  }
}
