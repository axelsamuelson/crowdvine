import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";

const shipmentUpdateSchema = z
  .object({
    source_label: z.string().min(1).max(200).optional(),
    carrier: z.string().min(1).max(40).optional(),
    tracking_number: z.string().min(1).max(120).optional(),
    boxes: z.number().int().positive().optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shipmentId: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id, shipmentId } = await params;
  const parsed = shipmentUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid shipment update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("order_reservation_shipments")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shipmentId)
    .eq("reservation_id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("shipment update error:", error);
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ shipment: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; shipmentId: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id, shipmentId } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("order_reservation_shipments")
    .delete()
    .eq("id", shipmentId)
    .eq("reservation_id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("shipment delete error:", error);
    return NextResponse.json({ error: "Failed to delete shipment" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
