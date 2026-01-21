import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

type ItemDecision = {
  orderItemId: string;
  approvedQuantity: number;
  decision: "approved" | "declined";
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "producer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.producer_id) {
      return NextResponse.json(
        { error: "No producer linked to this account" },
        { status: 400 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const decisions = Array.isArray(body?.items) ? (body.items as ItemDecision[]) : [];

    if (decisions.length === 0) {
      return NextResponse.json({ error: "No item decisions provided" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    const { data: reservation, error: reservationError } = await sb
      .from("order_reservations")
      .select("id, producer_id, status")
      .eq("id", id)
      .maybeSingle();

    if (reservationError) {
      return NextResponse.json({ error: reservationError.message }, { status: 500 });
    }
    if (!reservation) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (reservation.producer_id !== user.producer_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: items, error: itemsError } = await sb
      .from("order_reservation_items")
      .select("id, quantity")
      .eq("reservation_id", id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const qtyByItemId = new Map<string, number>();
    (items || []).forEach((it: any) => qtyByItemId.set(it.id, Number(it.quantity) || 0));

    // Validate decisions
    for (const d of decisions) {
      const requested = qtyByItemId.get(d.orderItemId);
      if (requested === undefined) {
        return NextResponse.json(
          { error: `Invalid orderItemId: ${d.orderItemId}` },
          { status: 400 },
        );
      }
      const approvedQty = Math.floor(Number(d.approvedQuantity) || 0);
      if (approvedQty < 0 || approvedQty > requested) {
        return NextResponse.json(
          { error: `approvedQuantity must be between 0 and ${requested}` },
          { status: 400 },
        );
      }
      if (d.decision === "declined" && approvedQty !== 0) {
        return NextResponse.json(
          { error: "Declined items must have approvedQuantity = 0" },
          { status: 400 },
        );
      }
    }

    const now = new Date().toISOString();

    // Apply updates per item
    for (const d of decisions) {
      const requested = qtyByItemId.get(d.orderItemId) ?? 0;
      const approvedQty =
        d.decision === "declined"
          ? 0
          : Math.min(requested, Math.floor(Number(d.approvedQuantity) || 0));

      const { error: updErr } = await sb
        .from("order_reservation_items")
        .update({
          producer_decision_status: d.decision,
          producer_approved_quantity: approvedQty,
          producer_decided_at: now,
          producer_decided_by: user.id,
        })
        .eq("id", d.orderItemId)
        .eq("reservation_id", id);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    // Recompute overall producer status from all items
    const { data: updatedItems, error: updatedItemsError } = await sb
      .from("order_reservation_items")
      .select("quantity, producer_decision_status, producer_approved_quantity")
      .eq("reservation_id", id);

    if (updatedItemsError) {
      return NextResponse.json({ error: updatedItemsError.message }, { status: 500 });
    }

    const allDecided = (updatedItems || []).every(
      (it: any) => String(it.producer_decision_status || "") !== "pending",
    );
    const totalRequested = (updatedItems || []).reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 0),
      0,
    );
    const totalApproved = (updatedItems || []).reduce(
      (sum: number, it: any) => sum + (Number(it.producer_approved_quantity) || 0),
      0,
    );

    let nextStatus: string = "pending_producer_approval";
    if (allDecided) {
      if (totalApproved <= 0) nextStatus = "declined";
      else if (totalApproved >= totalRequested) nextStatus = "approved";
      else nextStatus = "partly_approved";
    }

    const { data: updatedReservation, error: resUpdErr } = await sb
      .from("order_reservations")
      .update({
        status: nextStatus,
        producer_approved_at: nextStatus === "approved" || nextStatus === "partly_approved" ? now : null,
        producer_approved_by: nextStatus === "approved" || nextStatus === "partly_approved" ? user.id : null,
        producer_rejected_at: nextStatus === "declined" ? now : null,
        producer_rejected_by: nextStatus === "declined" ? user.id : null,
      })
      .eq("id", id)
      .select("id, status")
      .single();

    if (resUpdErr) {
      return NextResponse.json({ error: resUpdErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: updatedReservation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

