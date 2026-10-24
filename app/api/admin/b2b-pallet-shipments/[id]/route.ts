import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import {
  b2bPalletWriteHttpError,
  deleteB2bPalletShipment,
  updateB2bPalletShipment,
} from "@/lib/admin/b2b-pallet-writes";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();
    const body = await request.json();
    const full = await updateB2bPalletShipment(sb, id, body);
    return NextResponse.json(full);
  } catch (error) {
    const mapped = b2bPalletWriteHttpError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();
    const result = await deleteB2bPalletShipment(sb, id);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = b2bPalletWriteHttpError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
