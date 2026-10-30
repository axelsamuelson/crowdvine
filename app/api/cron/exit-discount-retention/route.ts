import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runExitDiscountRetention } from "@/lib/exit-discount/retention";

/**
 * Daily: delete unused exit discount leads + deactivate their promo codes
 * after EXIT_DISCOUNT_RETENTION_MONTHS (default 12).
 * Secured by CRON_SECRET.
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

    const sb = getSupabaseAdmin();
    const summary = await runExitDiscountRetention(sb);
    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/exit-discount-retention]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 },
    );
  }
}
