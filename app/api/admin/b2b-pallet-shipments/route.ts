import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import {
  b2bPalletWriteHttpError,
  createB2bPalletShipment,
} from "@/lib/admin/b2b-pallet-writes";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    const { data: shipments, error } = await sb
      .from("b2b_pallet_shipments")
      .select(B2B_PALLET_SHIPMENT_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching B2B pallet shipments:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(shipments || []);
  } catch (error) {
    console.error("Unexpected error in B2B pallet shipments API:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const body = await request.json();
    const full = await createB2bPalletShipment(sb, body);
    return NextResponse.json(full);
  } catch (error) {
    const mapped = b2bPalletWriteHttpError(error);
    if (mapped.status >= 500) {
      console.error("Unexpected error creating B2B pallet shipment:", error);
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
