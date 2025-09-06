import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = body.address;

    const sb = await supabaseServer();

    // Test address insertion
    const { data: savedAddress, error: addressError } = await sb
      .from("user_addresses")
      .insert({
        user_id: null,
        full_name: address.fullName,
        email: address.email,
        phone: address.phone,
        address_street: address.street,
        address_postcode: address.postcode,
        address_city: address.city,
        country_code: address.countryCode,
      })
      .select()
      .single();

    if (addressError) {
      return NextResponse.json(
        {
          error: "Address error",
          details: addressError,
        },
        { status: 500 },
      );
    }

    // Test reservation insertion with the real address ID
    const { data: testReservation, error: reservationError } = await sb
      .from("order_reservations")
      .insert({
        user_id: null,
        cart_id: "test-cart-id",
        address_id: savedAddress.id, // Use the real UUID
        status: "placed",
      })
      .select()
      .single();

    if (reservationError) {
      return NextResponse.json(
        {
          error: "Reservation error",
          details: reservationError,
          addressId: savedAddress.id,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      address: savedAddress,
      reservation: testReservation,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
