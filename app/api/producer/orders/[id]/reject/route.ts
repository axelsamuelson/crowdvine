import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "producer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.producer_id) {
      return NextResponse.json(
        { error: "No producer linked to this account" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === "string" ? body.note.slice(0, 2000) : null;

    const { id } = await params;
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

    const allowed = ["pending_producer_approval", "placed"];
    if (!allowed.includes(String(reservation.status))) {
      return NextResponse.json(
        { error: `Cannot reject order in status '${reservation.status}'` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await sb
      .from("order_reservations")
      .update({
        status: "rejected",
        producer_rejected_at: now,
        producer_rejected_by: user.id,
        producer_decision_note: note,
      })
      .eq("id", id)
      .select("id, status, producer_rejected_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

