import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { EventCategory, EventType } from "./event-tracker";

/**
 * Insert into user_events from API routes (no browser session).
 * Uses a synthetic session_id; omit PII from metadata.
 */
export async function logUserEventServer(opts: {
  userId?: string | null;
  eventType: EventType;
  eventCategory: EventCategory;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    await sb.from("user_events").insert({
      user_id: opts.userId ?? null,
      session_id: `server_${randomUUID()}`,
      event_type: opts.eventType,
      event_category: opts.eventCategory,
      event_metadata: opts.metadata ?? {},
      page_url: null,
      referrer: null,
      user_agent: "server",
    });
  } catch (e) {
    console.error("logUserEventServer:", e);
  }
}
