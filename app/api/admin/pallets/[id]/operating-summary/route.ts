import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { buildAdminPalletOperatingSummaryForId } from "@/lib/admin-pallet-operating-summary";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const summary = await buildAdminPalletOperatingSummaryForId(id);
    if (!summary) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }
    return NextResponse.json({ operating_summary: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
