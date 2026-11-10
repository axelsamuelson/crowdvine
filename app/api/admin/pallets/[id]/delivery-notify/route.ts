import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import {
  markPalletArrivedSwedenAndNotify,
  markPalletShippedAndNotify,
  setPalletExpectedDateAndNotify,
} from "@/lib/checkout/pallet-delivery-notify/notify";

/**
 * Minimal admin actions for post-close customer delivery emails.
 * Body:
 *  { action: "mark_shipped", windowStart, windowEnd }
 *  { action: "mark_arrived_sweden", deliveryDay }
 *  { action: "set_expected_date", expectedDate }
 *
 * Emails only when PALLET_CLOSE_FLOW_ENABLED + dual-offer compare + Resend.
 * Never sends when flags/key unset.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: palletId } = await params;
  if (!palletId) {
    return NextResponse.json({ error: "Missing pallet id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "").trim();

  if (action === "mark_shipped") {
    const result = await markPalletShippedAndNotify({
      palletId,
      windowStart: String(body.windowStart || ""),
      windowEnd: String(body.windowEnd || ""),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (action === "mark_arrived_sweden") {
    const result = await markPalletArrivedSwedenAndNotify({
      palletId,
      deliveryDay: String(body.deliveryDay || ""),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (action === "set_expected_date") {
    const result = await setPalletExpectedDateAndNotify({
      palletId,
      expectedDate: String(body.expectedDate || ""),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json(
    {
      error:
        "Unknown action. Use mark_shipped | mark_arrived_sweden | set_expected_date",
    },
    { status: 400 },
  );
}
