import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  applyLateDeliveryCancelForRefund,
  getLateDeliveryCancelEligibility,
} from "@/lib/checkout/pallet-delivery-notify/late-cancel";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const eligibility = await getLateDeliveryCancelEligibility({
    reservationId: id,
    userId: user.id,
  });
  return NextResponse.json(eligibility);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const result = await applyLateDeliveryCancelForRefund({
    reservationId: id,
    userId: user.id,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
