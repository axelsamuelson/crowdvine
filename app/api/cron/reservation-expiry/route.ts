import { NextRequest, NextResponse } from "next/server";

/**
 * Reservation expiry / extension-ask cron — DISABLED (Axel 2026-11-10).
 *
 * Shared-pallet orders have no time limit; do not send
 * "Vill du ge din reservation 30 dagar till?" or auto-cancel on no reply.
 *
 * Cron entry removed from vercel.json. This route remains as a safety net:
 * authenticated calls return 200 and do nothing (no emails, status changes,
 * or cancellations). Job logic stays in lib/reservations/expiry-run.ts for a
 * follow-up PR that reworks it into status emails.
 *
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      disabled: true,
      reason:
        "shared pallet orders have no time limit (Axel 2026-11-10)",
    },
    { status: 200 },
  );
}
