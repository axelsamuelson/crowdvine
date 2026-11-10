import { NextResponse } from "next/server";
import { runPalletCoverageClose } from "@/lib/pallet-coverage-close/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Coverage-based shared-pallet lock cron.
 * Default OFF — set PALLET_COVERAGE_CLOSE_ENABLED=true after dry-run.
 * Emails default OFF — PALLET_COVERAGE_CLOSE_SEND_EMAIL (like RESERVATION_EXPIRY_SEND_EMAIL).
 * Never auto-cancels orders. Does not apply migrations.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runPalletCoverageClose();
  return NextResponse.json({
    ok: true,
    summary,
    note: summary.sendEmail
      ? "PALLET_COVERAGE_CLOSE_SEND_EMAIL=true — emails may be sent"
      : "PALLET_COVERAGE_CLOSE_SEND_EMAIL is false (default) — no customer emails",
  });
}
