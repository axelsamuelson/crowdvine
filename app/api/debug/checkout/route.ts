import { NextResponse } from 'next/server';
import { CartService } from '@/src/lib/cart-service';
import { supabaseServer, getCurrentUser } from '@/lib/supabase-server';
import { emailService } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    console.log('=== DEBUG CHECKOUT START ===');
    
    // Parse body
    const body = await request.json();
    console.log('Body:', JSON.stringify(body, null, 2));
    
    // Get cart
    const cart = await CartService.getCart();
    console.log('Cart:', JSON.stringify(cart, null, 2));
    
    if (!cart || cart.totalQuantity === 0) {
      console.log('Cart is empty');
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    
    // Get current user
    const currentUser = await getCurrentUser();
    console.log('Current user:', currentUser?.id || 'null');
    
    // Save address
    const address = body.address;
    console.log('Saving address:', JSON.stringify(address, null, 2));
    
    const sb = await supabaseServer();
    const { data: savedAddress, error: addressError } = await sb
      .from('user_addresses')
      .insert({
        user_id: currentUser?.id || null,
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
    
    if (addressError) {
      console.error('Address error:', addressError);
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
    }
    
    console.log('Address saved:', savedAddress);
    
    // Create reservation
    console.log('Creating reservation...');
    const { data: reservation, error: reservationError } = await sb
      .from('order_reservations')
      .insert({
        user_id: currentUser?.id || null,
        cart_id: cart.id,
        address_id: savedAddress.id,
        status: 'placed'
      })
      .select()
      .single();
    
    if (reservationError) {
      console.error('Reservation error:', reservationError);
      return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
    }
    
    console.log('Reservation created:', reservation);
    
    // Create reservation items
    console.log('Creating reservation items...');
    const reservationItems = cart.lines.map(line => ({
      reservation_id: reservation.id,
      wine_id: line.merchandise.id.replace('-default', ''),
      quantity: line.quantity,
      price_band: line.cost.totalAmount.amount
    }));
    
    const { error: itemsError } = await sb
      .from('order_reservation_items')
      .insert(reservationItems);
    
    if (itemsError) {
      console.error('Items error:', itemsError);
      return NextResponse.json({ error: 'Failed to create reservation items' }, { status: 500 });
    }
    
    console.log('Reservation items created');
    
    // Convert to bookings
    console.log('Converting to bookings...');
    const bookings = cart.lines.map(line => ({
      wine_id: line.merchandise.id.replace('-default', ''),
      quantity: line.quantity,
      status: 'reserved'
    }));
    
    const { error: bookingsError } = await sb
      .from('bookings')
      .insert(bookings);
    
    if (bookingsError) {
      console.error('Bookings error:', bookingsError);
      return NextResponse.json({ error: 'Failed to create bookings' }, { status: 500 });
    }
    
    console.log('Bookings created');
    
    // Create tracking record
    console.log('Creating tracking record...');
    const { data: trackingCodeResult, error: trackingCodeError } = await sb.rpc('generate_tracking_code');
    if (trackingCodeError) {
      console.error('Tracking code error:', trackingCodeError);
    }
    
    const trackingCode = trackingCodeResult?.data || Math.random().toString().slice(2, 10);
    
    const { data: trackingRecord, error: trackingError } = await sb
      .from('reservation_tracking')
      .insert({
        reservation_id: reservation.id,
        customer_email: address.email,
        customer_name: address.fullName,
        tracking_code: trackingCode
      })
      .select()
      .single();
    
    if (trackingError) {
      console.error('Tracking error:', trackingError);
    } else {
      console.log('Tracking record created:', trackingRecord);
    }
    
    // Send email
    console.log('Sending email...');
    try {
      const emailData = {
        reservationId: reservation.id,
        trackingCode: trackingCode,
        customerName: address.fullName,
        customerEmail: address.email,
        items: cart.lines.map(line => ({
          wineName: line.merchandise.title.split(' ').slice(0, -1).join(' ') || 'Okänd vin',
          vintage: line.merchandise.title.split(' ').pop() || 'N/A',
          quantity: line.quantity,
          price: line.cost.totalAmount.amount
        })),
        totalAmount: cart.cost.totalAmount.amount,
        address: {
          street: address.street,
          postcode: address.postcode,
          city: address.city,
          countryCode: address.countryCode
        },
        createdAt: reservation.created_at
      };
      
      const emailSent = await emailService.sendReservationConfirmation(emailData);
      console.log('Email sent:', emailSent);
    } catch (emailError) {
      console.error('Email error:', emailError);
    }
    
    // Clear cart
    console.log('Clearing cart...');
    await CartService.clearCart();
    
    console.log('=== DEBUG CHECKOUT END ===');
    
    // Redirect to success page
    const successUrl = `/checkout/success?success=true&reservationId=${reservation.id}&message=${encodeURIComponent('Reservation placed successfully')}`;
    return NextResponse.redirect(new URL(successUrl, request.url));
    
  } catch (error: any) {
    console.error('=== DEBUG CHECKOUT ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
