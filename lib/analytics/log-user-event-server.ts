import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { EventCategory, EventType } from "./event-tracker";
import type { FirstTouch } from "./visitor-identity";

/**
 * Insert into user_events from API routes (no browser session).
 * Uses a synthetic session_id; omit PII from metadata.
 * Prefer passing visitorId / firstTouch from the browser when available.
 */
export async function logUserEventServer(opts: {
  userId?: string | null;
  visitorId?: string | null;
  eventType: EventType;
  eventCategory: EventCategory;
  metadata?: Record<string, unknown>;
  firstTouch?: FirstTouch | null;
}): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    let metadata: Record<string, unknown> = { ...(opts.metadata ?? {}) };
    if (
      (opts.eventType === "reservation_completed" ||
        opts.eventType === "signup_completed") &&
      opts.firstTouch
    ) {
      metadata = { ...metadata, first_touch: opts.firstTouch };
    }
    await sb.from("user_events").insert({
      user_id: opts.userId ?? null,
      session_id: `server_${randomUUID()}`,
      visitor_id: opts.visitorId?.trim() || null,
      event_type: opts.eventType,
      event_category: opts.eventCategory,
      event_metadata: metadata,
      page_url: null,
      referrer: null,
      user_agent: "server",
    }).then(({ error }) => {
      if (!error) return;
      if (!/visitor_id|schema cache|Could not find/i.test(error.message || "")) {
        console.error("logUserEventServer:", error.message);
        return;
      }
      // Pre-migration fallback
      void sb.from("user_events").insert({
        user_id: opts.userId ?? null,
        session_id: `server_${randomUUID()}`,
        event_type: opts.eventType,
        event_category: opts.eventCategory,
        event_metadata: metadata,
        page_url: null,
        referrer: null,
        user_agent: "server",
      });
    });
  } catch (e) {
    console.error("logUserEventServer:", e);
  }
}
