import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";

const shipmentCreateSchema = z
  .object({
    source_key: z.string().min(1).max(200),
    source_label: z.string().min(1).max(200),
    carrier: z.string().min(1).max(40).default("ups"),
    tracking_number: z.string().min(1).max(120),
    boxes: z.number().int().positive().default(1),
  })
  .strict();

async function assertDirectBoxReservation(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("order_reservations")
    .select("id, fulfillment_channel")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return { error: NextResponse.json({ error: "Reservation not found" }, { status: 404 }) };
  }
  if (data.fulfillment_channel !== "direct_box") {
    return {
      error: NextResponse.json(
        { error: "Shipments only apply to direct_box orders" },
        { status: 400 },
      ),
    };
  }
  return { reservation: data };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id } = await params;
  const check = await assertDirectBoxReservation(id);
  if ("error" in check && check.error) return check.error;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("order_reservation_shipments")
    .select("*")
    .eq("reservation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("shipments list error:", error);
    return NextResponse.json({ error: "Failed to load shipments" }, { status: 500 });
  }

  return NextResponse.json({ shipments: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id } = await params;
  const check = await assertDirectBoxReservation(id);
  if ("error" in check && check.error) return check.error;

  const parsed = shipmentCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid shipment", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const row = {
    reservation_id: id,
    source_key: parsed.data.source_key.trim(),
    source_label: parsed.data.source_label.trim(),
    carrier: (parsed.data.carrier || "ups").trim().toLowerCase(),
    tracking_number: parsed.data.tracking_number.trim(),
    boxes: parsed.data.boxes,
    created_by: adminAuth.id,
  };

  const { data, error } = await supabase
    .from("order_reservation_shipments")
    .upsert(row, { onConflict: "reservation_id,source_key" })
    .select("*")
    .single();

  if (error) {
    console.error("shipment create error:", error);
    return NextResponse.json({ error: "Failed to save shipment" }, { status: 500 });
  }

  return NextResponse.json({ shipment: data }, { status: 201 });
}
