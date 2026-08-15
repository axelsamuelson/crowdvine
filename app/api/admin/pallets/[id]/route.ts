import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sumReservedBottlesOnPalletResult } from "@/lib/pallet-fill-count";
import {
  derivePreShippingAutoStatus,
  resolveMinBottlesToShip,
} from "@/lib/pallet-ship-progress";

/**
 * Canonical auto-status from pallet fill (not zone/producer mapping).
 * Used when switching status_mode to auto.
 */
async function recomputeAutoPalletStatus(
  sb: ReturnType<typeof getSupabaseAdmin>,
  palletId: string,
) {
  const { data: pallet, error: palletError } = await sb
    .from("pallets")
    .select("id, bottle_capacity, min_bottles_to_complete")
    .eq("id", palletId)
    .maybeSingle();

  if (palletError || !pallet) {
    throw new Error("Pallet not found");
  }

  const fillResult = await sumReservedBottlesOnPalletResult(palletId);
  if (!fillResult.ok) {
    throw new Error(fillResult.error);
  }

  const bottlesFilled = fillResult.bottles;
  const minToShip = resolveMinBottlesToShip(
    (pallet as { min_bottles_to_complete?: number }).min_bottles_to_complete,
  );
  const nextStatus = derivePreShippingAutoStatus({
    bottlesFilled,
    minBottlesToShip: minToShip,
  });
  const isComplete = bottlesFilled >= minToShip;

  return {
    nextStatus,
    bottlesFilled,
    reservationCount: bottlesFilled > 0 ? 1 : 0,
    isComplete,
    allPaid: false,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
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
  try {
    await requireAdmin();
  } catch {
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

  // is_complete is owned exclusively by syncPalletShipReadiness / completePallet.
  // Never accept client writes of this flag (prevents silent divergence).
  if (body && typeof body === "object") {
    delete body.is_complete;
    delete body.completed_at;
  }

  // Guard: pallet.status should be auto-driven by default.
  // Only allow changing status when status_mode is manual, or when switching status_mode to manual in the same request.
  // When switching to auto, body.status is set by recompute above and must be written.
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
      typeof (existing as { status_mode?: string }).status_mode === "string"
        ? (existing as { status_mode: string }).status_mode
        : "auto";
    const requestedMode =
      typeof body.status_mode === "string" ? body.status_mode : undefined;

    const allowStatusUpdate =
      existingMode === "manual" ||
      requestedMode === "manual" ||
      requestedMode === "auto";

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

  // Keep persisted is_complete + auto status aligned with bottle threshold.
  try {
    const { syncPalletShipReadiness } = await import("@/lib/pallet-completion");
    await syncPalletShipReadiness(resolvedParams.id);
  } catch (e) {
    console.error("[Admin pallet PUT] syncPalletShipReadiness:", e);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
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
