import { NextRequest, NextResponse } from "next/server";
import { GET as incremental } from "@/app/api/cron/analytics-refresh/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Nightly rebuild (~03:30 Europe/Stockholm in winter = 02:30 UTC). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set("mode", "full");
  const proxied = new NextRequest(url, request);
  return incremental(proxied);
}
