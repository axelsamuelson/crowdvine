import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const reservationId = searchParams.get('reservationId');
    const trackingCode = searchParams.get('trackingCode');

    if (!email || (!reservationId && !trackingCode)) {
      return NextResponse.json(
        { error: 'Email och antingen reservations-ID eller tracking-kod krävs' },
        { status: 400 }
      );
    }

    const sb = await supabaseServer();

    let reservation;
    let reservationError;

    // Om tracking code finns, använd den för att hitta reservationen
    if (trackingCode) {
      const { data: trackingRecord, error: trackingError } = await sb
        .from('reservation_tracking')
        .select(`
          reservation_id,
          customer_email,
          customer_name
        `)
        .eq('tracking_code', trackingCode)
        .eq('customer_email', email)
        .single();

      if (trackingError || !trackingRecord) {
        console.error('Tracking record not found:', trackingError);
        return NextResponse.json(
          { error: 'Reservationen hittades inte med den angivna tracking-koden' },
          { status: 404 }
        );
      }

      // Uppdatera last_accessed_at
      await sb
        .from('reservation_tracking')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('tracking_code', trackingCode);

      // Hämta reservation med det hittade reservation_id
      const { data: res, error: resError } = await sb
        .from('order_reservations')
        .select(`
          id,
          status,
          created_at,
          user_addresses!inner (
            full_name,
            email,
            address_street,
            address_postcode,
            address_city,
            country_code
          )
        `)
        .eq('id', trackingRecord.reservation_id)
        .single();

      reservation = res;
      reservationError = resError;
    } else {
      // Använd reservationId direkt
      const { data: res, error: resError } = await sb
        .from('order_reservations')
        .select(`
          id,
          status,
          created_at,
          user_addresses!inner (
            full_name,
            email,
            address_street,
            address_postcode,
            address_city,
            country_code
          )
        `)
        .eq('id', reservationId)
        .eq('user_addresses.email', email)
        .single();

      reservation = res;
      reservationError = resError;
    }

    if (reservationError || !reservation) {
      console.error('Reservation not found:', reservationError);
      return NextResponse.json(
        { error: 'Reservationen hittades inte' },
        { status: 404 }
      );
    }

    // Hämta reservationsvaror
    const { data: items, error: itemsError } = await sb
      .from('order_reservation_items')
      .select(`
        quantity,
        price_band,
        campaign_items!inner (
          wine_name,
          vintage
        )
      `)
      .eq('reservation_id', reservationId);

    if (itemsError) {
      console.error('Failed to get reservation items:', itemsError);
      return NextResponse.json(
        { error: 'Kunde inte hämta reservationsvaror' },
        { status: 500 }
      );
    }

    // Formatera svaret
    const response = {
      id: reservation.id,
      status: reservation.status,
      created_at: reservation.created_at,
      customer_name: reservation.user_addresses.full_name,
      customer_email: reservation.user_addresses.email,
      items: items.map(item => ({
        wine_name: item.campaign_items.wine_name,
        vintage: item.campaign_items.vintage,
        quantity: item.quantity,
        price_band: item.price_band
      })),
      address: {
        street: reservation.user_addresses.address_street,
        postcode: reservation.user_addresses.address_postcode,
        city: reservation.user_addresses.address_city,
        country_code: reservation.user_addresses.country_code
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching reservation status:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod när reservationsstatus skulle hämtas' },
      { status: 500 }
    );
  }
}
