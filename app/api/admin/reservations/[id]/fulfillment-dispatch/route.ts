import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";
import {
  assertDispatchTransition,
  isDirectBoxDispatchStatus,
} from "@/lib/commerce/direct-box-dispatch";

const bodySchema = z
  .object({
    status: z
      .string()
      .refine(isDirectBoxDispatchStatus, "Invalid fulfillment_dispatch_status"),
    /** Optional override when marking completed (ISO string) or clear with null. */
    delivered_at: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fulfillment dispatch update", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: reservation, error: loadErr } = await supabase
    .from("order_reservations")
    .select(
      "id, fulfillment_channel, fulfillment_dispatch_status, delivered_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    console.error("fulfillment-dispatch load error:", loadErr);
    return NextResponse.json({ error: "Failed to load reservation" }, { status: 500 });
  }
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (reservation.fulfillment_channel !== "direct_box") {
    return NextResponse.json(
      { error: "fulfillment_dispatch_status only applies to direct_box orders" },
      { status: 400 },
    );
  }

  let nextStatus: string;
  try {
    nextStatus = assertDispatchTransition(
      reservation.fulfillment_dispatch_status,
      parsed.data.status,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Illegal transition" },
      { status: 400 },
    );
  }

  if (!isDirectBoxDispatchStatus(nextStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    fulfillment_dispatch_status: nextStatus,
    fulfillment_dispatch_status_updated_at: nowIso,
    fulfillment_dispatch_status_updated_by: adminAuth.id,
  };

  if (nextStatus === "completed") {
    if (parsed.data.delivered_at !== undefined) {
      patch.delivered_at = parsed.data.delivered_at;
    } else if (!reservation.delivered_at) {
      patch.delivered_at = nowIso;
    }
  } else if (parsed.data.delivered_at !== undefined) {
    // Allow admin correction of delivered_at without requiring completed transition
    patch.delivered_at = parsed.data.delivered_at;
  }

  const { data: updated, error: updErr } = await supabase
    .from("order_reservations")
    .update(patch)
    .eq("id", id)
    .select(
      "id, fulfillment_dispatch_status, fulfillment_dispatch_status_updated_at, fulfillment_dispatch_status_updated_by, delivered_at",
    )
    .single();

  if (updErr) {
    console.error("fulfillment-dispatch update error:", updErr);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  return NextResponse.json({ reservation: updated });
}

/** Allow correcting delivered_at without a status transition. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const deliveredSchema = z
    .object({
      delivered_at: z.union([z.string().datetime(), z.null()]),
    })
    .strict();

  const { id } = await params;
  const parsed = deliveredSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delivered_at" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: reservation, error: loadErr } = await supabase
    .from("order_reservations")
    .select("id, fulfillment_channel")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (reservation.fulfillment_channel !== "direct_box") {
    return NextResponse.json(
      { error: "delivered_at only applies to direct_box orders" },
      { status: 400 },
    );
  }

  const { data: updated, error: updErr } = await supabase
    .from("order_reservations")
    .update({ delivered_at: parsed.data.delivered_at })
    .eq("id", id)
    .select("id, delivered_at, fulfillment_dispatch_status")
    .single();

  if (updErr) {
    return NextResponse.json({ error: "Failed to update delivered_at" }, { status: 500 });
  }

  return NextResponse.json({ reservation: updated });
}
