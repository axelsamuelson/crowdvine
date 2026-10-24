import { NextRequest, NextResponse } from "next/server";
import { updateCustomerShippingRate } from "@/lib/admin/lager-frakt-writes";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const result = await updateCustomerShippingRate(
      getSupabaseAdmin(),
      id,
      body,
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    const status = msg === "Admin authentication required" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
