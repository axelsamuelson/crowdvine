import { NextRequest, NextResponse } from "next/server";
import { runPalletCloseJob } from "@/lib/checkout/pallet-close/run";

/**
 * Hourly shared-pallet close flow (deadline / charge / choice / timeouts).
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 *
 * Gated by isPalletCloseFlowEnabled() (CHECKOUT_DUAL_OFFER_COMPARE or
 * PALLET_CLOSE_FLOW_ENABLED). Defaults OFF — production stays inert.
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

    const summary = await runPalletCloseJob();
    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/pallet-close]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
