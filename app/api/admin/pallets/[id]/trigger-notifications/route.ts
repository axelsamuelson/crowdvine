import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { triggerPaymentNotifications } from "@/lib/email/pallet-complete";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await triggerPaymentNotifications(id);
    return NextResponse.json({
      success: true,
      message: `Payment notifications sent for pallet ${id}`,
    });
  } catch (error) {
    console.error("trigger-notifications error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
