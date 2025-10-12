import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Create a Stripe Checkout Session for a specific reservation
 * This generates a payment link that customers can use to complete payment
 */
export async function createPaymentLinkForReservation(reservationId: string): Promise<string> {
  console.log(`💳 [Payment Link] Creating payment link for reservation ${reservationId}`);
  
  const supabase = getSupabaseAdmin();
  
  try {
    // Get reservation details with related data
    const { data: reservation, error: reservationError } = await supabase
      .from('order_reservations')
      .select(`
        *,
        profiles!inner(email, full_name),
        user_addresses(*),
        pallets(name, delivery_zone_id)
      `)
      .eq('id', reservationId)
      .single();
      
    if (reservationError) {
      console.error(`❌ [Payment Link] Error fetching reservation ${reservationId}:`, reservationError);
      throw new Error(`Reservation ${reservationId} not found: ${reservationError.message}`);
    }
    
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    
    console.log(`📋 [Payment Link] Reservation details:`, {
      id: reservation.id,
      quantity: reservation.quantity,
      totalAmount: reservation.total_amount_cents,
      email: reservation.profiles.email,
      palletName: reservation.pallets?.name
    });
    
    // Validate reservation is in correct state
    if (reservation.status !== 'pending_payment') {
      throw new Error(`Reservation ${reservationId} is not in pending_payment status (current: ${reservation.status})`);
    }
    
    // Check if payment link already exists
    if (reservation.payment_link && reservation.payment_intent_id) {
      console.log(`✅ [Payment Link] Payment link already exists for reservation ${reservationId}`);
      return reservation.payment_link;
    }
    
    // Create Stripe Checkout Session (payment mode, not setup!)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // Pay now, not save card for future use
      customer_email: reservation.profiles.email,
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: `Wine Pallet Order - ${reservation.pallets?.name || 'Pallet'}`,
            description: `${reservation.quantity} bottles from ${reservation.pallets?.name || 'your pallet'}`
          },
          unit_amount: reservation.total_amount_cents
        },
        quantity: 1
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancelled?reservation_id=${reservationId}`,
      expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
      metadata: {
        reservation_id: reservationId,
        pallet_id: reservation.pallet_id,
        customer_email: reservation.profiles.email,
        bottle_count: reservation.quantity.toString(),
        total_amount: reservation.total_amount_cents.toString()
      },
      // Add customer information for better UX
      shipping_address_collection: {
        allowed_countries: ['SE', 'NO', 'DK', 'FI', 'DE', 'FR', 'GB']
      },
      // Allow customer to add billing address
      billing_address_collection: 'required',
      // Set payment method types (cards work better than SetupIntent)
      payment_method_types: ['card'],
      // Add automatic tax if configured
      automatic_tax: { enabled: false }, // Can be enabled later if needed
    });
    
    console.log(`✅ [Payment Link] Stripe session created: ${session.id}`);
    
    // Save payment link and session ID to database
    const { error: updateError } = await supabase
      .from('order_reservations')
      .update({
        payment_link: session.url,
        payment_intent_id: session.payment_intent as string,
        payment_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', reservationId);
      
    if (updateError) {
      console.error(`❌ [Payment Link] Error saving payment link for reservation ${reservationId}:`, updateError);
      throw new Error(`Failed to save payment link: ${updateError.message}`);
    }
    
    console.log(`✅ [Payment Link] Payment link saved for reservation ${reservationId}: ${session.url}`);
    
    return session.url;
  } catch (error) {
    console.error(`❌ [Payment Link] Error creating payment link for reservation ${reservationId}:`, error);
    throw error;
  }
}

/**
 * Get payment status for a reservation
 */
export async function getPaymentStatus(reservationId: string) {
  const supabase = getSupabaseAdmin();
  
  try {
    const { data: reservation, error } = await supabase
      .from('order_reservations')
      .select('payment_status, payment_intent_id, payment_link, payment_deadline, status')
      .eq('id', reservationId)
      .single();
      
    if (error || !reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    
    return {
      paymentStatus: reservation.payment_status,
      paymentIntentId: reservation.payment_intent_id,
      paymentLink: reservation.payment_link,
      paymentDeadline: reservation.payment_deadline,
      reservationStatus: reservation.status,
      hasPaymentLink: !!reservation.payment_link,
      isExpired: reservation.payment_deadline ? new Date(reservation.payment_deadline) < new Date() : false
    };
  } catch (error) {
    console.error(`❌ [Payment Status] Error getting payment status for reservation ${reservationId}:`, error);
    throw error;
  }
}

/**
 * Regenerate payment link if expired or missing
 */
export async function regeneratePaymentLink(reservationId: string): Promise<string> {
  console.log(`🔄 [Payment Link] Regenerating payment link for reservation ${reservationId}`);
  
  const supabase = getSupabaseAdmin();
  
  try {
    // Clear existing payment link
    await supabase
      .from('order_reservations')
      .update({
        payment_link: null,
        payment_intent_id: null
      })
      .eq('id', reservationId);
      
    // Create new payment link
    return await createPaymentLinkForReservation(reservationId);
  } catch (error) {
    console.error(`❌ [Payment Link] Error regenerating payment link for reservation ${reservationId}:`, error);
    throw error;
  }
}

/**
 * Cancel payment link (if reservation is cancelled)
 */
export async function cancelPaymentLink(reservationId: string): Promise<void> {
  console.log(`❌ [Payment Link] Cancelling payment link for reservation ${reservationId}`);
  
  const supabase = getSupabaseAdmin();
  
  try {
    // Get payment intent ID if exists
    const { data: reservation } = await supabase
      .from('order_reservations')
      .select('payment_intent_id')
      .eq('id', reservationId)
      .single();
      
    // Cancel Stripe payment intent if exists
    if (reservation?.payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(reservation.payment_intent_id);
        console.log(`✅ [Payment Link] Cancelled Stripe payment intent ${reservation.payment_intent_id}`);
      } catch (stripeError) {
        console.error(`❌ [Payment Link] Error cancelling Stripe payment intent:`, stripeError);
        // Continue anyway, we'll clean up the database
      }
    }
    
    // Clear payment link from database
    await supabase
      .from('order_reservations')
      .update({
        payment_link: null,
        payment_intent_id: null,
        payment_status: 'cancelled'
      })
      .eq('id', reservationId);
      
    console.log(`✅ [Payment Link] Payment link cancelled for reservation ${reservationId}`);
  } catch (error) {
    console.error(`❌ [Payment Link] Error cancelling payment link for reservation ${reservationId}:`, error);
    throw error;
  }
}
