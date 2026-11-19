import { NextRequest, NextResponse } from "next/server";
import { getReservationExpiryConfig } from "@/lib/reservations/expiry-config";
import { runReservationExpiryJob } from "@/lib/reservations/expiry-run";

/**
 * Daily: 4-week status emails while shared pallets are open.
 *
 * Replaces the disabled extension/auto-cancel cron (Axel 2026-11-10 / #213).
 * Orders have no time limit — this job never auto-cancels for no reply.
 *
 * Customer emails are OPT-IN: RESERVATION_EXPIRY_SEND_EMAIL defaults to false.
 * Set RESERVATION_EXPIRY_SEND_EMAIL=true in Vercel after reviewing dry-run counts.
 *
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
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

    const config = getReservationExpiryConfig();
    const summary = await runReservationExpiryJob();
    return NextResponse.json(
      {
        success: true,
        mode: "status_email",
        sendEmail: config.sendEmail,
        dryRun: config.dryRun,
        dryRunSummary: {
          scanned: summary.scanned,
          wouldSendStatusEmails: summary.wouldSendStatusEmails,
          statusEmailsSent: summary.statusEmailsSent,
          skipped: summary.skipped,
          waits: summary.waits,
          flaggedCharged: summary.flaggedCharged,
          cancelledNoReply: summary.cancelledNoReply,
          hardExpired: summary.hardExpired,
          errors: summary.errors,
          note: config.sendEmail
            ? "RESERVATION_EXPIRY_SEND_EMAIL=true — emails may be sent"
            : "RESERVATION_EXPIRY_SEND_EMAIL is false (default) — no customer emails; set true in Vercel to enable",
        },
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
