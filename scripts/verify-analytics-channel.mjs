#!/usr/bin/env node
/**
 * Verify analytics_channel classification (TS mirror of SQL).
 * Also reports last-60d session breakdown from live data when env is set.
 *
 * Usage: node --import tsx scripts/verify-analytics-channel.mjs
 *    or: npx tsx scripts/verify-analytics-channel.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  analyticsChannel,
} from "../lib/analytics/analytics-channel.ts";

config({ path: ".env.local" });

const cases = [
  {
    name: "pactwines.com → internal (not referral)",
    args: ["https://www.pactwines.com/vin", null, null],
    expect: "internal",
  },
  {
    name: "dirtywine.se → internal",
    args: ["https://dirtywine.se/", null, null],
    expect: "internal",
  },
  {
    name: "l.instagram.com → social",
    args: ["https://l.instagram.com/", null, null],
    expect: "social",
  },
  {
    name: "m.facebook.com → social",
    args: ["https://m.facebook.com/", null, null],
    expect: "social",
  },
  {
    name: "google → organic",
    args: ["https://www.google.com/", null, null],
    expect: "organic",
  },
  {
    name: "utm_medium=cpc → paid",
    args: [null, "google", "cpc"],
    expect: "paid",
  },
  {
    name: "utm_medium=organic → organic",
    args: [null, "google", "organic"],
    expect: "organic",
  },
  {
    name: "chatgpt.com → ai",
    args: ["https://chatgpt.com/", null, null],
    expect: "ai",
  },
  {
    name: "example.com → referral",
    args: ["https://news.example.com/article", null, null],
    expect: "referral",
  },
  {
    name: "empty → direct",
    args: ["", null, null],
    expect: "direct",
  },
  {
    name: "internal beats social-looking path on own domain",
    args: ["https://pactwines.com/vin?utm_source=instagram", "instagram", null],
    expect: "internal",
  },
];

let failed = 0;
console.log("=== Unit checks (analyticsChannel TS) ===");
for (const c of cases) {
  const got = analyticsChannel(...c.args);
  const ok = got === c.expect;
  console.log(`${ok ? "✓" : "✗"} ${c.name}: ${got}${ok ? "" : ` (expected ${c.expect})`}`);
  if (!ok) failed += 1;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("\nSkip live 60d breakdown (missing Supabase env).");
  process.exit(failed ? 1 : 0);
}

const sb = createClient(url, key);
const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

console.log("\n=== Last 60d session channel breakdown (first event) ===");

async function fetchEvents() {
  const pageSize = 1000;
  const maxRows = 50000;
  const selectAttempts = [
    {
      table: "analytics_sessions_clean",
      cols: "session_id, referrer, page_url, event_metadata, created_at, channel, site",
    },
    {
      table: "analytics_sessions_clean",
      cols: "session_id, referrer, page_url, event_metadata, created_at, site",
    },
    {
      table: "user_events",
      cols: "session_id, referrer, page_url, event_metadata, created_at",
    },
  ];

  for (const attempt of selectAttempts) {
    const out = [];
    let error = null;
    for (let from = 0; from < maxRows; from += pageSize) {
      let q = sb
        .from(attempt.table)
        .select(attempt.cols)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (attempt.table === "user_events") {
        q = q.not("session_id", "like", "server_%");
      }
      const { data, error: err } = await q;
      if (err) {
        error = err;
        break;
      }
      out.push(...(data ?? []));
      if ((data ?? []).length < pageSize) break;
    }
    if (!error) {
      console.log(`Source: ${attempt.table} (${out.length} events)`);
      return out;
    }
    console.warn(`${attempt.table} [${attempt.cols.split(",")[0]}…]: ${error.message}`);
  }
  return [];
}

const events = await fetchEvents();
const firstBySession = new Map();
for (const e of events) {
  const sid = String(e.session_id);
  if (firstBySession.has(sid)) continue;
  if (e.site === null && "site" in e) {
    // clean view always has site; skip null-site if present without filtering
  }
  firstBySession.set(sid, e);
}

const counts = {};
for (const e of firstBySession.values()) {
  let ch = e.channel;
  if (!ch) {
    const md = e.event_metadata && typeof e.event_metadata === "object" ? e.event_metadata : {};
    let source = typeof md.utm_source === "string" ? md.utm_source : null;
    let medium = typeof md.utm_medium === "string" ? md.utm_medium : null;
    try {
      if (e.page_url) {
        const u = new URL(e.page_url);
        source = source || u.searchParams.get("utm_source");
        medium = medium || u.searchParams.get("utm_medium");
      }
    } catch {
      /* ignore */
    }
    ch = analyticsChannel(e.referrer, source, medium);
  }
  counts[ch] = (counts[ch] || 0) + 1;
}

const total = [...Object.values(counts)].reduce((a, b) => a + b, 0);
const order = ["internal", "paid", "social", "organic", "ai", "referral", "direct"];
console.log(`Sessions: ${total}`);
for (const ch of order) {
  const n = counts[ch] || 0;
  const pct = total ? ((n / total) * 100).toFixed(1) : "0.0";
  console.log(`  ${ch.padEnd(10)} ${String(n).padStart(6)}  ${pct}%`);
}

// Spot-check pactwines referrers are internal
let pactAsReferral = 0;
let pactInternal = 0;
for (const e of firstBySession.values()) {
  const ref = (e.referrer || "").toLowerCase();
  if (!ref.includes("pactwines.com")) continue;
  const ch = analyticsChannel(e.referrer, null, null);
  if (ch === "internal") pactInternal += 1;
  if (ch === "referral") pactAsReferral += 1;
}
console.log(
  `\npactwines.com referrers: ${pactInternal} internal, ${pactAsReferral} misclassified as referral`,
);

let igSocial = 0;
let igOther = 0;
for (const e of firstBySession.values()) {
  const ref = (e.referrer || "").toLowerCase();
  if (!ref.includes("instagram")) continue;
  const ch = analyticsChannel(e.referrer, null, null);
  if (ch === "social") igSocial += 1;
  else igOther += 1;
}
console.log(`instagram referrers: ${igSocial} social, ${igOther} other`);

process.exit(failed || pactAsReferral > 0 ? 1 : 0);
