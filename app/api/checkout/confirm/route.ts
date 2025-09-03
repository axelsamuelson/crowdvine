import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getOrSetCartId } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    const cartId = await getOrSetCartId();
    const sb = await supabaseServer();
    
    // Parse form data
    const formData = await req.formData();
    const address = {
      fullName: formData.get('address.fullName') as string,
      email: formData.get('address.email') as string,
      phone: formData.get('address.phone') as string,
      street: formData.get('address.street') as string,
      postcode: formData.get('address.postcode') as string,
      city: formData.get('address.city') as string,
      countryCode: formData.get('address.countryCode') as string,
    };

    // 1) Read cart_lines
    const { data: lines, error: e1 } = await sb
      .from('cart_lines')
      .select('item_id, quantity, band, wines!inner(wine_name,vintage,base_price_cents)')
      .eq('cart_id', cartId);

    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
    if (!lines?.length) return NextResponse.json({ error: 'empty_cart' }, { status: 400 });

    // 2) Save user address
    const { data: addr, error: e3 } = await sb
      .from('user_addresses')
      .insert({
        full_name: address.fullName,
        email: address.email,
        phone: address.phone,
        address_street: address.street,
        address_postcode: address.postcode,
        address_city: address.city,
        country_code: address.countryCode
      })
      .select()
      .single();

    if (e3) return NextResponse.json({ error: e3.message }, { status: 400 });

    // 3) Resolve delivery_zone (MVP: by country)
    // For MVP, we'll just use a simple country-based approach
    // In the future, this could be more sophisticated with lat/lon matching
    let deliveryZoneId = null;
    
    // Try to find a delivery zone for this country
    const { data: dz } = await sb
      .from('pallet_zones')
      .select('id')
      .eq('zone_type', 'delivery')
      .eq('country_code', address.countryCode)
      .limit(1)
      .single();
    
    if (dz) {
      deliveryZoneId = dz.id;
    } else {
      // For MVP, if no specific zone exists, we'll create a simple one
      // In production, this would be more sophisticated
      console.log('No delivery zone found for country:', address.countryCode);
    }

    // 4) Create reservation
    const { data: resv, error: e4 } = await sb
      .from('order_reservations')
      .insert({
        cart_id: cartId,
        address_id: addr.id,
        delivery_zone_id: deliveryZoneId,
        status: 'placed'
      })
      .select()
      .single();

    if (e4) return NextResponse.json({ error: e4.message }, { status: 400 });

    // 5) Reservation items
    const itemsPayload = lines.map(l => ({
      reservation_id: resv.id,
      item_id: l.item_id,
      quantity: l.quantity,
      price_band: l.band || 'market'
    }));

    const { error: e5 } = await sb
      .from('order_reservation_items')
      .insert(itemsPayload);

    if (e5) return NextResponse.json({ error: e5.message }, { status: 400 });

    // 6) Convert to bookings (reservation = bindande intresse, betalning senare)
    const bookingsRows = lines.map(l => ({
      user_id: null, // eller current user om inloggad
      item_id: l.item_id,
      quantity: l.quantity,
      band: l.band || 'market',
      status: 'reserved'
    }));

    const { error: e6 } = await sb
      .from('bookings')
      .insert(bookingsRows);

    if (e6) return NextResponse.json({ error: e6.message }, { status: 400 });

    // 7) Clear cart
    await sb
      .from('cart_lines')
      .delete()
      .eq('cart_id', cartId);

    return NextResponse.json({ 
      ok: true, 
      reservationId: resv.id,
      redirectUrl: '/profile'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
