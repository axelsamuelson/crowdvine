import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sb = await supabaseServer();
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
  const sb = await supabaseServer();
  const resolvedParams = await params;
  const body = await request.json();

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
  const sb = await supabaseServer();
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
