import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { runSystembolagetSync } from "@/lib/systembolaget/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Manual sync trigger for admins. Runs the sync in-process so CRON_SECRET
 * never leaves the server (no client-side secret).
 */
export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSystembolagetSync();
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
