#!/usr/bin/env node
/**
 * Verify UTM link builder helpers + campaign attribution path.
 * Inserts a tagged page_view, then confirms channel=social and campaign=bio.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  analyticsChannel,
  utmFromPageUrl,
} from "../lib/analytics/analytics-channel.ts";
import {
  buildTrackedUrl,
  normalizeUtmValue,
  normalizeDestinationPath,
} from "../lib/analytics/utm-normalize.ts";

config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- helpers ---
assert(normalizeUtmValue("TikTok Bio") === "tiktok_bio", "normalize spaces");
assert(normalizeUtmValue("  Bio  ") === "bio", "normalize trim/case");
assert(normalizeDestinationPath("shop") === "/shop", "path slash");
assert(
  normalizeDestinationPath("https://pactwines.com/wines?x=1") === "/wines",
  "strip origin/query",
);

const url = buildTrackedUrl({
  destination_path: "/",
  utm_source: "TikTok",
  utm_medium: "Social",
  utm_campaign: "Bio Link",
});
assert(
  url ===
    "https://pactwines.com/?utm_source=tiktok&utm_medium=social&utm_campaign=bio_link",
  `buildTrackedUrl got ${url}`,
);

const parsed = utmFromPageUrl(url);
assert(parsed.source === "tiktok", "utm source from url");
assert(parsed.medium === "social", "utm medium from url");
assert(parsed.campaign === "bio_link", "utm campaign from url");
assert(
  analyticsChannel(null, parsed.source, parsed.medium) === "social",
  "channel social for tiktok",
);
assert(
  analyticsChannel(null, "newsletter", "email") === "referral",
  "newsletter → referral",
);

console.log("✓ helpers + channel classification");

// --- live insert ---
const marker = Date.now();
const sessionId = `utm_verify_${marker}`;
const visitorId = `visitor_utm_${marker}`;
const pageUrl = buildTrackedUrl({
  destination_path: "/",
  utm_source: "tiktok",
  utm_medium: "social",
  utm_campaign: "bio",
});

const { error: insertErr } = await sb.from("user_events").insert({
  session_id: sessionId,
  visitor_id: visitorId,
  event_type: "page_view",
  event_category: "navigation",
  page_url: pageUrl,
  referrer: null,
  user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) UTMVerify/1.0",
  event_metadata: { path: "/", verify: "utm_link_builder" },
});

if (insertErr) {
  console.error("Insert failed:", insertErr.message);
  process.exit(1);
}

const { data: rows, error: readErr } = await sb
  .from("analytics_sessions_clean")
  .select("session_id, page_url, channel, event_metadata, visitor_id")
  .eq("session_id", sessionId)
  .limit(5);

if (readErr) {
  console.warn("analytics_sessions_clean read:", readErr.message);
}

const event = rows?.[0];
if (!event) {
  // fallback user_events
  const { data: raw } = await sb
    .from("user_events")
    .select("session_id, page_url, event_metadata, visitor_id")
    .eq("session_id", sessionId)
    .limit(1);
  assert(raw?.[0], "event not found after insert");
  const u = utmFromPageUrl(raw[0].page_url);
  const ch = analyticsChannel(null, u.source, u.medium);
  assert(ch === "social", `expected social, got ${ch}`);
  assert(normalizeUtmValue(u.campaign) === "bio", `campaign ${u.campaign}`);
  console.log("✓ insert + attribution via user_events (view unavailable)");
} else {
  const u = utmFromPageUrl(event.page_url);
  const ch =
    event.channel || analyticsChannel(null, u.source, u.medium);
  assert(ch === "social", `expected social channel, got ${ch}`);
  assert(
    normalizeUtmValue(u.campaign || "") === "bio",
    `expected campaign bio, got ${u.campaign}`,
  );
  console.log("✓ insert + attribution via analytics_sessions_clean", {
    channel: ch,
    campaign: normalizeUtmValue(u.campaign),
    page_url: event.page_url,
  });
}

// --- campaign links table ---
const { error: tableErr } = await sb
  .from("analytics_campaign_links")
  .select("id")
  .limit(1);

if (tableErr) {
  console.log(
    "⚠ analytics_campaign_links missing — apply migrations/188_analytics_campaign_links.sql",
  );
  console.log("  ", tableErr.message);
} else {
  const { data: link, error: linkErr } = await sb
    .from("analytics_campaign_links")
    .insert({
      destination_path: "/",
      utm_source: "tiktok",
      utm_medium: "social",
      utm_campaign: "bio",
      label: `verify_${marker}`,
    })
    .select("id, utm_campaign, utm_source")
    .single();
  if (linkErr) {
    console.error("Link insert failed:", linkErr.message);
    process.exit(1);
  }
  console.log("✓ analytics_campaign_links insert", link);
  await sb.from("analytics_campaign_links").delete().eq("id", link.id);
}

console.log("DONE");
