import { NextRequest, NextResponse } from "next/server";
import { runCrawlSession } from "@/lib/menu-extraction/crawler";

/**
 * Cron: run Starwinelist crawl for Stockholm.
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 * Schedule: 0 3 * * * (daily 03:00 UTC)
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BROWSERLESS_API_KEY?.trim() && process.env.USE_LOCAL_FETCH !== "true") {
    console.warn("[cron/crawl-menus] Crawl skipped: BROWSERLESS_API_KEY is not set");
    return NextResponse.json({ ok: true, skipped: true, reason: "missing_browserless_key" });
  }
  try {
    const summary = await runCrawlSession("stockholm");
    console.warn("[cron/crawl-menus] Summary:", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/crawl-menus] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
