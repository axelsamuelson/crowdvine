import { NextRequest, NextResponse } from "next/server";
import { runReservationExpiryJob } from "@/lib/reservations/expiry-run";

/**
 * Daily: 30-day extension asks / 7-day no-reply cancels / optional max-age end.
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 *
 * Gates (defaults live after Axel approval; env can override off):
 * - RESERVATION_EXPIRY_ENABLED (default true)
 * - RESERVATION_EXPIRY_DRY_RUN (default false)
 * - RESERVATION_EXPIRY_SEND_EMAIL (default true)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const secret = process.env.CRON_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 200 },
      );
    }

    const summary = await runReservationExpiryJob();
    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/reservation-expiry]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
