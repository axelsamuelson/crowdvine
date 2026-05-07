import { NextRequest, NextResponse } from "next/server";
import { runCrawlSession } from "@/lib/menu-extraction/crawler";

/**
 * Cron: run Starwinelist crawl for Stockholm (PDF upload + menu_documents only; extraction runs in /api/cron/extract-menus).
 * Uses @sparticuz/chromium on Vercel (no Browserless). Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 * Schedule: 0 3 * * * (daily 03:00 UTC)
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runCrawlSession("stockholm", false);
    console.warn("[cron/crawl-menus] Summary:", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/crawl-menus] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
