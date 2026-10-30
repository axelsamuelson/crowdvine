import { NextRequest, NextResponse } from "next/server";
import { runPalletHygiene } from "@/lib/pallet-hygiene";

/**
 * Recalculate auto pallet status (same sync as after an order) and cancel
 * pallets with 0 active bottles empty ≥ 7 days. Never sends emails.
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

    const results = await runPalletHygiene();
    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/pallet-hygiene]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
