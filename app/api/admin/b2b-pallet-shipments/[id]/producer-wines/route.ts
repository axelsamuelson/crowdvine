import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  b2bPalletWriteHttpError,
  replaceB2bProducerWines,
} from "@/lib/admin/b2b-pallet-writes";

/**
 * PUT /api/admin/b2b-pallet-shipments/[id]/producer-wines
 * Replace this producer's wines on the pallet (add / remove / change qty).
 * Other producers' items are left untouched.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: shipmentId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const full = await replaceB2bProducerWines(sb, shipmentId, body);
    return NextResponse.json(full);
  } catch (err) {
    const mapped = b2bPalletWriteHttpError(err);
    if (mapped.status >= 500) {
      console.error("[producer-wines] PUT:", err);
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
