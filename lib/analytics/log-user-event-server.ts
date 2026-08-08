import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { EventCategory, EventType } from "./event-tracker";
import type { FirstTouch } from "./visitor-identity";

/**
 * Insert into user_events from API routes (no browser session).
 * Uses a synthetic session_id; omit PII from metadata.
 * Prefer passing visitorId / firstTouch from the browser when available.
 *
 * For reservation_completed / signup_completed, sets metadata.internal when
 * the caller marks it, or when the user is in admin_metrics_excluded_profiles.
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

    if (
      opts.eventType === "reservation_completed" ||
      opts.eventType === "signup_completed"
    ) {
      if (opts.firstTouch) {
        metadata = { ...metadata, first_touch: opts.firstTouch };
      }
      if (visitorId) {
        metadata = { ...metadata, visitor_id: visitorId };
      }
    }

    let internal = opts.internal === true || metadata.internal === true;
    if (
      !internal &&
      opts.userId &&
      (opts.eventType === "reservation_completed" ||
        opts.eventType === "signup_completed")
    ) {
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

    const row = {
      user_id: opts.userId ?? null,
      session_id: `server_${randomUUID()}`,
      visitor_id: visitorId,
      country_code: countryCode,
      event_type: opts.eventType,
      event_category: opts.eventCategory,
      event_metadata: metadata,
      page_url: null as string | null,
      referrer: null as string | null,
      user_agent: "server",
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
          session_id: `server_${randomUUID()}`,
        });
      });
  } catch (e) {
    console.error("logUserEventServer:", e);
  }
}
