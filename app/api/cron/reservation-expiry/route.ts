import { NextRequest, NextResponse } from "next/server";
import { runReservationExpiryJob } from "@/lib/reservations/expiry-run";

/**
 * Daily: 4-week status emails while shared pallets are open.
 *
 * Replaces the disabled extension/auto-cancel cron (Axel 2026-11-10 / #213).
 * Orders have no time limit — this job never auto-cancels for no reply.
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 *
 * Gates (defaults live; env can override off):
 * - RESERVATION_EXPIRY_ENABLED (default true)
 * - RESERVATION_EXPIRY_DRY_RUN (default false)
 * - RESERVATION_EXPIRY_SEND_EMAIL (default true)
 * - RESERVATION_STATUS_EMAIL_DAYS (default 28)
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
    return NextResponse.json(
      {
        success: true,
        mode: "status_email",
        summary,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/reservation-expiry]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
