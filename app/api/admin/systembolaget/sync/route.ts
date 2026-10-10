import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { runSystembolagetSync } from "@/lib/systembolaget/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Manual sync trigger for admins. Runs the sync in-process so CRON_SECRET
 * never leaves the server (no client-side secret).
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let allowShrink = false;
  const raw = await request.text();
  if (raw.trim()) {
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    allowShrink =
      typeof body === "object" &&
      body !== null &&
      "confirmShrink" in body &&
      (body as { confirmShrink: unknown }).confirmShrink === true;
  }

  try {
    const result = await runSystembolagetSync({ allowShrink });
    if (!result.ok && result.reason === "shrink_guard") {
      return NextResponse.json(result, { status: 409 });
    }
    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/systembolaget/sync]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
