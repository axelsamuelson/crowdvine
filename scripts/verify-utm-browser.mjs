#!/usr/bin/env node
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  analyticsChannel,
  utmFromPageUrl,
} from "../lib/analytics/analytics-channel.ts";
import { normalizeUtmValue } from "../lib/analytics/utm-normalize.ts";

config({ path: ".env.local" });

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const marker = Date.now();
  const trackedPath = `/?utm_source=tiktok&utm_medium=social&utm_campaign=bio&utm_verify=${marker}`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  await page.goto(`http://127.0.0.1:3000${trackedPath}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await new Promise((r) => setTimeout(r, 3000));
  const firstTouch = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("pact_first_touch") || "null");
    } catch {
      return null;
    }
  });
  const href = await page.evaluate(() => window.location.href);
  await browser.close();

  console.log("href", href);
  console.log("first_touch", JSON.stringify(firstTouch, null, 2));

  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: events, error } = await sb
    .from("user_events")
    .select("session_id, page_url, event_type, created_at")
    .eq("event_type", "page_view")
    .gte("created_at", since)
    .ilike("page_url", `%utm_verify=${marker}%`)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) console.error(error);
  console.log("events", events?.length ?? 0);
  if (events?.[0]) {
    const u = utmFromPageUrl(events[0].page_url);
    console.log("from page_url", {
      channel: analyticsChannel(null, u.source, u.medium),
      campaign: normalizeUtmValue(u.campaign || ""),
    });
  }
  if (!firstTouch || firstTouch.first_channel !== "social") {
    process.exitCode = 1;
    console.error("FAIL: expected first_channel=social");
  }
  if (!firstTouch || firstTouch.first_utm_campaign !== "bio") {
    process.exitCode = 1;
    console.error("FAIL: expected first_utm_campaign=bio");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
