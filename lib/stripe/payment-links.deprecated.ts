/**
 * DEPRECATED: Replaced by SetupIntent + PaymentIntent flow.
 * See app/api/checkout/confirm/route.ts and lib/pallet-completion.ts.
 * This file is kept temporarily for reference and will be removed in a later cleanup phase.
 */

import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";

/**
 * Create a Stripe Checkout Session for a specific reservation
 * This generates a payment link that customers can use to complete payment
 */
export async function createPaymentLinkForReservation(
  reservationId: string,
): Promise<string> {
  console.log(
    `💳 [Payment Link] Creating payment link for reservation ${reservationId}`,
  );

  const supabase = getSupabaseAdmin();

  try {
    // Get reservation details with related data
    const { data: reservation, error: reservationError } = await supabase
      .from("order_reservations")
      .select(
        `
        *,
        profiles!inner(email, full_name),
        user_addresses(*),
        pallets(name, delivery_zone_id)
      `,
      )
      .eq("id", reservationId)
      .single();

    if (reservationError) {
      console.error(
        `❌ [Payment Link] Error fetching reservation ${reservationId}:`,
        reservationError,
      );
      throw new Error(
        `Reservation ${reservationId} not found: ${reservationError.message}`,
      );
    }

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    // Get bottle count and total amount from order_reservation_items
    const { data: items } = await supabase
      .from("order_reservation_items")
      .select(
        `
        quantity,
        wines(base_price_cents)
      `,
      )
      .eq("reservation_id", reservationId);

    const bottleCount =
      items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const totalAmountCents =
      items?.reduce((sum, item) => {
        const price = item.wines?.base_price_cents || 0;
        const quantity = item.quantity || 0;
        return sum + price * quantity;
      }, 0) || 0;

    console.log(`📋 [Payment Link] Reservation details:`, {
      id: reservation.id,
      quantity: bottleCount,
      totalAmount: totalAmountCents,
      email: reservation.profiles.email,
      palletName: reservation.pallets?.name,
    });

    // Validate we have items and amount
    if (bottleCount === 0 || totalAmountCents === 0) {
      throw new Error(
        `Reservation ${reservationId} has no items or invalid amount`,
      );
    }

    // Validate reservation is in correct state
    if (
      reservation.status !== "pending_payment" &&
      reservation.status !== "placed"
    ) {
      throw new Error(
        `Reservation ${reservationId} is not in pending_payment status (current: ${reservation.status})`,
      );
    }

    // Check if payment link already exists
    if (reservation.payment_link && reservation.payment_intent_id) {
      console.log(
        `✅ [Payment Link] Payment link already exists for reservation ${reservationId}`,
      );
      return reservation.payment_link;
    }

    // Get base URL for Stripe redirects
    const baseUrl = getAppUrl();

    console.log(`🌐 [Payment Link] Using base URL: ${baseUrl}`);

    // Create Stripe Checkout Session (payment mode, not setup!)
    const session = await stripe!.checkout.sessions.create({
      mode: "payment", // Pay now, not save card for future use
      customer_email: reservation.profiles.email,
      line_items: [
        {
          price_data: {
            currency: "sek",
            product_data: {
              name: `Wine Pallet Order - ${reservation.pallets?.name || "Pallet"}`,
              description: `${bottleCount} bottles from ${reservation.pallets?.name || "your pallet"}`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancelled?reservation_id=${reservationId}`,
      metadata: {
        reservation_id: reservationId,
        pallet_id: reservation.pallet_id,
        customer_email: reservation.profiles.email,
        bottle_count: bottleCount.toString(),
        total_amount: totalAmountCents.toString(),
      },
      shipping_address_collection: {
        allowed_countries: ["SE", "NO", "DK", "FI", "DE", "FR", "GB"],
      },
      billing_address_collection: "required",
      payment_method_types: ["card"],
      automatic_tax: { enabled: false },
    });

    console.log(`✅ [Payment Link] Stripe session created: ${session.id}`);

    // Save payment link and session ID to database
    const { error: updateError } = await supabase
      .from("order_reservations")
      .update({
        payment_link: session.url,
        payment_intent_id: session.payment_intent as string,
        payment_deadline: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq("id", reservationId);

    if (updateError) {
      console.error(
        `❌ [Payment Link] Error saving payment link for reservation ${reservationId}:`,
        updateError,
      );
      throw new Error(`Failed to save payment link: ${updateError.message}`);
    }

    console.log(
      `✅ [Payment Link] Payment link saved for reservation ${reservationId}: ${session.url}`,
    );

    return session.url;
  } catch (error) {
    console.error(
      `❌ [Payment Link] Error creating payment link for reservation ${reservationId}:`,
      error,
    );
    throw error;
  }
}

export async function getPaymentStatus(reservationId: string) {
  const supabase = getSupabaseAdmin();

  const { data: reservation, error } = await supabase
    .from("order_reservations")
    .select(
      "payment_status, payment_intent_id, payment_link, payment_deadline, status",
    )
    .eq("id", reservationId)
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
    isExpired: reservation.payment_deadline
      ? new Date(reservation.payment_deadline) < new Date()
      : false,
  };
}

export async function regeneratePaymentLink(
  reservationId: string,
): Promise<string> {
  console.log(
    `🔄 [Payment Link] Regenerating payment link for reservation ${reservationId}`,
  );

  const supabase = getSupabaseAdmin();

  // Clear existing payment link
  await supabase
    .from("order_reservations")
    .update({
      payment_link: null,
      payment_intent_id: null,
    })
    .eq("id", reservationId);

  // Create new payment link
  return await createPaymentLinkForReservation(reservationId);
}

export async function cancelPaymentLink(reservationId: string): Promise<void> {
  console.log(
    `❌ [Payment Link] Cancelling payment link for reservation ${reservationId}`,
  );

  const supabase = getSupabaseAdmin();

  // Get payment intent ID if exists
  const { data: reservation } = await supabase
    .from("order_reservations")
    .select("payment_intent_id")
    .eq("id", reservationId)
    .single();

  // Cancel Stripe payment intent if exists
  if (reservation?.payment_intent_id) {
    try {
      await stripe!.paymentIntents.cancel(reservation.payment_intent_id);
      console.log(
        `✅ [Payment Link] Cancelled Stripe payment intent ${reservation.payment_intent_id}`,
      );
    } catch (stripeError) {
      console.error(`❌ [Payment Link] Error cancelling Stripe payment intent:`, stripeError);
    }
  }

  // Clear payment link from database
  await supabase
    .from("order_reservations")
    .update({
      payment_link: null,
      payment_intent_id: null,
      payment_status: "cancelled",
    })
    .eq("id", reservationId);

  console.log(`✅ [Payment Link] Payment link cancelled for reservation ${reservationId}`);
}

