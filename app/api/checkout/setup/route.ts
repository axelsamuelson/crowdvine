/**
 * DEPRECATED: Replaced by Payment Element SetupIntent flow (Fas 2.2).
 *
 * This route previously created a Stripe Checkout Session in `mode: "setup"`.
 * It is kept temporarily to avoid hard 404s while the new flow is rolled out.
 */

import { NextResponse } from "next/server";

export async function GET() {
  console.warn(
    "[DEPRECATED] /api/checkout/setup called. Use the Payment Element flow (Fas 2.2) instead.",
  );
  return NextResponse.json(
    { error: "Deprecated endpoint" },
    { status: 410 },
  );
}

