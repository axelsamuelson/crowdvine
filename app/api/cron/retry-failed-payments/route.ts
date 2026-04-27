import { NextRequest, NextResponse } from "next/server";
import { retryFailedPayments } from "@/lib/payment-retry";

/**
 * Hourly: retry card charges for reservations with due retry_scheduled_at.
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

    const results = await retryFailedPayments();
    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/retry-failed-payments]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
