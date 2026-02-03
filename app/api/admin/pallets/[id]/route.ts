import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { evaluateCompletionRules } from "@/lib/pallet-completion-rules";

async function recomputeAutoPalletStatus(sb: ReturnType<typeof getSupabaseAdmin>, palletId: string) {
  // Load pallet zones + rules
  const { data: pallet, error: palletError } = await sb
    .from("pallets")
    .select("id, pickup_zone_id, delivery_zone_id, bottle_capacity, completion_rules")
    .eq("id", palletId)
    .maybeSingle();

  if (palletError || !pallet) {
    throw new Error("Pallet not found");
  }

  // Find candidate reservations by delivery zone (like other data-driven code)
  const statusesAll = [
    "pending_producer_approval",
    "placed",
    "approved",
    "partly_approved",
    "pending_payment",
    "confirmed",
  ];

  const { data: reservations, error: resErr } = await sb
    .from("order_reservations")
    .select("id, status, payment_status, delivery_zone_id")
    .eq("delivery_zone_id", (pallet as any).delivery_zone_id)
    .in("status", statusesAll);

  if (resErr) throw new Error(resErr.message);

  const reservationIds = (reservations || []).map((r: any) => r.id);
  if (reservationIds.length === 0) {
    return { nextStatus: "open" as const, reservationCount: 0, isComplete: false, allPaid: false };
  }

  const { data: items, error: itemsErr } = await sb
    .from("order_reservation_items")
    .select(
      `
      reservation_id,
      quantity,
      producer_approved_quantity,
      wines(
        producers(pickup_zone_id)
      )
    `,
    )
    .in("reservation_id", reservationIds);

  if (itemsErr) throw new Error(itemsErr.message);

  // Determine which reservations actually map to this pallet (derived pickup zone must match)
  const pickupZonesByReservation = new Map<string, Set<string>>();
  (items || []).forEach((it: any) => {
    const rid = it.reservation_id as string;
    const pz = it?.wines?.producers?.pickup_zone_id as string | undefined;
    if (!rid || !pz) return;
    const set = pickupZonesByReservation.get(rid) || new Set<string>();
    set.add(pz);
    pickupZonesByReservation.set(rid, set);
  });

  const mappedReservationIds = reservationIds.filter((rid) => {
    const set = pickupZonesByReservation.get(rid);
    return set && set.size === 1 && Array.from(set)[0] === (pallet as any).pickup_zone_id;
  });

  if (mappedReservationIds.length === 0) {
    return { nextStatus: "open" as const, reservationCount: 0, isComplete: false, allPaid: false };
  }

  // Count bottles in "counted" statuses only (same model as pallet-data)
  const countedStatuses = new Set([
    "placed",
    "approved",
    "partly_approved",
    "pending_payment",
    "confirmed",
  ]);

  const statusByReservationId = new Map<string, string>();
  const paymentByReservationId = new Map<string, string>();
  (reservations || []).forEach((r: any) => {
    statusByReservationId.set(r.id, String(r.status || ""));
    paymentByReservationId.set(r.id, String(r.payment_status || ""));
  });

  let currentBottles = 0;
  (items || []).forEach((it: any) => {
    const rid = it.reservation_id as string;
    if (!mappedReservationIds.includes(rid)) return;
    if (!countedStatuses.has(statusByReservationId.get(rid) || "")) return;
    const qty =
      it.producer_approved_quantity === null || it.producer_approved_quantity === undefined
        ? Number(it.quantity) || 0
        : Number(it.producer_approved_quantity) || 0;
    currentBottles += qty;
  });

  const rules = (pallet as any).completion_rules || null;
  const evaluated = evaluateCompletionRules(rules, { bottles: currentBottles, profit_sek: 0 });
  const isComplete =
    evaluated === null
      ? currentBottles >= (Number((pallet as any).bottle_capacity) || 0)
      : evaluated;

  const allPaid =
    mappedReservationIds.length > 0 &&
    mappedReservationIds.every((rid) => {
      const ps = paymentByReservationId.get(rid) || "";
      const st = statusByReservationId.get(rid) || "";
      return ps === "paid" || st === "confirmed";
    });

  if (mappedReservationIds.length === 0) return { nextStatus: "open" as const, reservationCount: 0, isComplete, allPaid };
  if (!isComplete) return { nextStatus: "consolidating" as const, reservationCount: mappedReservationIds.length, isComplete, allPaid };
  if (isComplete && !allPaid) return { nextStatus: "complete" as const, reservationCount: mappedReservationIds.length, isComplete, allPaid };
  return { nextStatus: "awaiting_pickup" as const, reservationCount: mappedReservationIds.length, isComplete, allPaid };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (adminAuth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const resolvedParams = await params;
  const { data, error } = await sb
    .from("pallets")
    .select(
      `
      *,
      delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
      pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type)
    `,
    )
    .eq("id", resolvedParams.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (adminAuth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const resolvedParams = await params;
  const body = await request.json();

  // If switching to auto, recompute status immediately so stale "delivered" etc. doesn't stick.
  if (body?.status_mode === "auto") {
    try {
      const recomputed = await recomputeAutoPalletStatus(sb, resolvedParams.id);
      body.status = recomputed.nextStatus;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to recompute status" },
        { status: 500 },
      );
    }
  }

  // Guard: pallet.status should be auto-driven by default.
  // Only allow changing status when status_mode is manual, or when switching status_mode to manual in the same request.
  if (body && (body.status !== undefined || body.status_mode !== undefined)) {
    const { data: existing, error: existingError } = await sb
      .from("pallets")
      .select("status_mode, status")
      .eq("id", resolvedParams.id)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    const existingMode =
      typeof (existing as any).status_mode === "string" ? (existing as any).status_mode : "auto";
    const requestedMode =
      typeof body.status_mode === "string" ? body.status_mode : undefined;

    const allowStatusUpdate =
      existingMode === "manual" || requestedMode === "manual";

    if (body.status !== undefined && !allowStatusUpdate) {
      return NextResponse.json(
        { error: "Status is auto-driven. Switch pallet.status_mode to 'manual' to override." },
        { status: 400 },
      );
    }
  }

  const { data, error } = await sb
    .from("pallets")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", resolvedParams.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (adminAuth !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const resolvedParams = await params;

  // First check if there are any bookings/reservations for this pallet
  const { data: bookings, error: bookingsError } = await sb
    .from("bookings")
    .select("id")
    .eq("pallet_id", resolvedParams.id)
    .limit(1);

  if (bookingsError) {
    return NextResponse.json(
      { error: `Failed to check bookings: ${bookingsError.message}` },
      { status: 500 },
    );
  }

  if (bookings && bookings.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete pallet: It has ${bookings.length} associated booking(s). Please remove all bookings first.`,
      },
      { status: 400 },
    );
  }

  // Check reservations as well - reservations are linked to zones, not directly to pallets
  // We need to check if this pallet's zones are used in any reservations
  // First get the pallet's zones
  const { data: pallet, error: palletError } = await sb
    .from("pallets")
    .select("delivery_zone_id, pickup_zone_id")
    .eq("id", resolvedParams.id)
    .single();

  if (palletError) {
    return NextResponse.json(
      { error: `Failed to get pallet: ${palletError.message}` },
      { status: 500 },
    );
  }

  // Check if any reservations use this pallet's zones
  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id")
    .or(
      `pickup_zone_id.eq.${pallet.pickup_zone_id},delivery_zone_id.eq.${pallet.delivery_zone_id}`,
    )
    .limit(1);

  if (reservationsError) {
    return NextResponse.json(
      { error: `Failed to check reservations: ${reservationsError.message}` },
      { status: 500 },
    );
  }

  if (reservations && reservations.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete pallet: Its zones are used in ${reservations.length} reservation(s). Please remove all reservations first.`,
      },
      { status: 400 },
    );
  }

  // If no dependencies, proceed with deletion
  const { error } = await sb
    .from("pallets")
    .delete()
    .eq("id", resolvedParams.id);

  if (error) {
    return NextResponse.json(
      { error: `Failed to delete pallet: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
