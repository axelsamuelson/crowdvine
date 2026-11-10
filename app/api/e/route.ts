import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import {
  FIRST_PARTY_EVENT_MAX_BYTES,
  validateFirstPartyEventPayload,
  withServerSiteMetadata,
} from "@/lib/analytics/first-party-event";
import { deriveAnalyticsSiteFromHost } from "@/lib/analytics/request-site";
import { isUserEventsSchemaError } from "@/lib/analytics/user-events-schema-lag";
import {
  analyticsIngestLimiter,
  getClientIdentifier,
} from "@/lib/rate-limiter";

function looksLikeSchemaMismatch(message: string): boolean {
  return (
    isUserEventsSchemaError(message) ||
    /\bhost\b|\bsite\b|visitor_id|country_code|schema cache|Could not find|PGRST|column/i.test(
      message,
    )
  );
}

/**
 * First-party analytics ingest.
 * Accepts the same client event shape formerly posted to Supabase REST,
 * validates it, derives host/site from the request Host header, and inserts
 * with the service role.
 */
export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  if (!analyticsIngestLimiter.isAllowed(identifier)) {
    const resetTime = analyticsIngestLimiter.getResetTime(identifier);
    const retryAfter = Math.max(
      1,
      Math.ceil((resetTime - Date.now()) / 1000),
    );
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(analyticsIngestLimiter.maxRequests),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    Number.parseInt(contentLength, 10) > FIRST_PARTY_EVENT_MAX_BYTES
  ) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (Buffer.byteLength(rawText, "utf8") > FIRST_PARTY_EVENT_MAX_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateFirstPartyEventPayload(raw);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validated.status },
    );
  }

  const { host, site } = deriveAnalyticsSiteFromHost(
    request.headers.get("host") ?? request.headers.get("x-forwarded-host"),
  );

  const event = validated.event;
  const event_metadata = withServerSiteMetadata(event.event_metadata, site);

  // Never trust client user_id — resolve from the signed-in session only.
  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const fullRow = {
    user_id: userId,
    session_id: event.session_id,
    visitor_id: event.visitor_id,
    country_code: event.country_code,
    event_type: event.event_type,
    event_category: event.event_category,
    event_metadata,
    page_url: event.page_url,
    referrer: event.referrer,
    user_agent: event.user_agent,
    host: host || null,
    site,
  };

  // Migration 284 may not be applied yet — same row without host/site.
  const withoutHostSite = {
    user_id: userId,
    session_id: event.session_id,
    visitor_id: event.visitor_id,
    country_code: event.country_code,
    event_type: event.event_type,
    event_category: event.event_category,
    event_metadata,
    page_url: event.page_url,
    referrer: event.referrer,
    user_agent: event.user_agent,
  };

  // Pre-181/186 lag: drop visitor_id + country_code.
  const withoutVisitorCountry = {
    user_id: userId,
    session_id: event.session_id,
    event_type: event.event_type,
    event_category: event.event_category,
    event_metadata,
    page_url: event.page_url,
    referrer: event.referrer,
    user_agent: event.user_agent,
  };

  // Audit stub shape.
  const stubRow = {
    user_id: userId,
    event_name: event.event_type,
    event_metadata,
  };

  try {
    const sb = getSupabaseAdmin();
    const attempts = [fullRow, withoutHostSite, withoutVisitorCountry, stubRow];

    let lastMessage = "";
    for (let i = 0; i < attempts.length; i++) {
      const { error } = await sb.from("user_events").insert(attempts[i]);
      if (!error) {
        return new NextResponse(null, { status: 204 });
      }
      lastMessage = error.message || "";
      // Only continue cascading on schema/column mismatches.
      if (!looksLikeSchemaMismatch(lastMessage)) {
        console.error("[api/e] insert failed:", lastMessage);
        return NextResponse.json({ error: "Insert failed" }, { status: 500 });
      }
    }

    console.error("[api/e] all insert fallbacks failed:", lastMessage);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  } catch (e) {
    console.error("[api/e]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
