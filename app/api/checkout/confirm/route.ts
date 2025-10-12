import { NextResponse } from "next/server";
import { CartService } from "@/src/lib/cart-service";
import { supabaseServer, getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { determineZones } from "@/lib/zone-matching";
import { 
  awardPointsForOwnOrder, 
  awardPointsForInviteSecondOrder,
  checkPalletMilestone,
  awardPointsForPalletMilestone,
} from "@/lib/membership/points-engine";
import { 
  applyProgressionBuffs, 
  checkAndAwardProgressionRewards 
} from "@/lib/membership/progression-rewards";

export async function POST(request: Request) {
  try {
    console.log("=== CHECKOUT CONFIRM START ===");

    // Handle both JSON and form data
    let body;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else {
      // Handle form data
      const formData = await request.formData();
      body = {
        address: {
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          street: formData.get("street"),
          postcode: formData.get("postcode"),
          city: formData.get("city"),
          countryCode: formData.get("countryCode"),
        },
        selectedDeliveryZoneId: formData.get("selectedDeliveryZoneId"),
        selectedPalletId: formData.get("selectedPalletId"),
        // paymentMethodId removed - using new payment flow
      };
    }

    console.log("Checkout confirm body:", body);

    const { address } = body;

    if (!address) {
      console.error("Missing address in request body");
      return NextResponse.json(
        { error: "Missing address information" },
        { status: 400 },
      );
    }

    // Get current user to ensure we have an email address
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Ensure we have an email address - use authenticated user's email as fallback
    if (!address.email || address.email.trim() === "") {
      address.email = user.email;
      console.log("📧 Using authenticated user email as fallback:", user.email);
    }

    // Get current cart
    const cart = await CartService.getCart();
    if (!cart || cart.totalQuantity === 0) {
      console.error("Cart is empty");
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    console.log("Processing cart:", cart);

    // SERVER-SIDE VALIDATION: 6-bottle rule
    console.log("🔍 [Checkout API] Validating 6-bottle rule...");
    const { validateSixBottleRule } = await import("@/lib/checkout-validation");
    const validation = await validateSixBottleRule(cart.lines as any);
    
    if (!validation.isValid) {
      console.error("❌ [Checkout API] 6-bottle validation failed:", validation.errors);
      return NextResponse.json(
        { 
          error: "Order must contain bottles in multiples of 6 per producer",
          validationErrors: validation.errors,
          producerValidations: validation.producerValidations
        },
        { status: 400 }
      );
    }
    console.log("✅ [Checkout API] 6-bottle validation passed");

    const sb = await supabaseServer();
    const sbAdmin = getSupabaseAdmin();

    // Get current user if authenticated
    const currentUser = await getCurrentUser();
    console.log("Current user:", currentUser?.id || "Anonymous");

    // Save customer address
    console.log("Saving customer address:", address);
    const { data: savedAddress, error: addressError } = await sb
      .from("user_addresses")
      .insert({
        user_id: currentUser?.id || null,
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
      console.error("Failed to save address:", addressError);
      return NextResponse.json(
        { error: "Failed to save address" },
        { status: 500 },
      );
    }

    console.log("Address saved:", savedAddress);

    // Determine pickup and delivery zones FIRST (before creating reservation)
    console.log("Determining zones based on cart items and delivery address");
    const zones = await determineZones(cart.lines, {
      postcode: address.postcode,
      city: address.city,
      countryCode: address.countryCode,
    });

    console.log("Zones determined:", zones);

    // Use selected delivery zone if provided
    let finalDeliveryZoneId = zones.deliveryZoneId;
    if (body.selectedDeliveryZoneId) {
      finalDeliveryZoneId = body.selectedDeliveryZoneId;
      console.log("Using selected delivery zone:", finalDeliveryZoneId);
    }

    // Use selected pallet if provided, otherwise find matching pallet
    let palletId = null;
    if (body.selectedPalletId) {
      palletId = body.selectedPalletId;
      console.log("Using selected pallet:", palletId);
    } else if (zones.pickupZoneId && finalDeliveryZoneId) {
      const { data: matchingPallets, error: palletsError } = await sb
        .from("pallets")
        .select("id")
        .eq("pickup_zone_id", zones.pickupZoneId)
        .eq("delivery_zone_id", finalDeliveryZoneId)
        .limit(1);

      if (!palletsError && matchingPallets && matchingPallets.length > 0) {
        palletId = matchingPallets[0].id;
        console.log("Found matching pallet:", palletId);
      }
    }

    // Create order reservation (now with pallet_id and zones)
    console.log("Creating order reservation");
    const { data: reservation, error: reservationError } = await sbAdmin
      .from("order_reservations")
      .insert({
        user_id: currentUser?.id || null,
        cart_id: cart.id,
        address_id: savedAddress.id,
        pickup_zone_id: zones.pickupZoneId,
        delivery_zone_id: finalDeliveryZoneId,
        pallet_id: palletId,
        status: "pending_payment",
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Failed to create reservation:", reservationError);
      return NextResponse.json(
        { error: "Failed to create reservation" },
        { status: 500 },
      );
    }

    console.log("Reservation created:", reservation);

    // Create reservation items
    console.log("Creating reservation items");
    const reservationItems = cart.lines.map((line) => ({
      reservation_id: reservation.id,
      item_id: line.merchandise.id,
      quantity: line.quantity,
      price_band: "market",
    }));

    const { error: itemsError } = await sb
      .from("order_reservation_items")
      .insert(reservationItems);

    if (itemsError) {
      console.error("Failed to create reservation items:", itemsError);
      return NextResponse.json(
        { error: "Failed to create reservation items" },
        { status: 500 },
      );
    }

    console.log("Reservation items created");

    // Convert cart items to bookings (reuse palletId from above)
    console.log("Converting cart items to bookings with pallet:", palletId);

    const bookings = cart.lines.map((line) => ({
      user_id: currentUser?.id || null,
      item_id: line.merchandise.id,
      quantity: line.quantity,
      band: "market",
      status: "reserved",
      pallet_id: palletId,
    }));

    const { error: bookingsError } = await sb.from("bookings").insert(bookings);

    if (bookingsError) {
      console.error("Failed to create bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to create bookings" },
        { status: 500 },
      );
    }

    console.log("Bookings created");

    // Update reservation with zone information
    if (zones.pickupZoneId || finalDeliveryZoneId) {
      const { error: updateError } = await sb
        .from("order_reservations")
        .update({
          pickup_zone_id: zones.pickupZoneId,
          delivery_zone_id: finalDeliveryZoneId,
        })
        .eq("id", reservation.id);

      if (updateError) {
        console.error("Failed to update reservation with zones:", updateError);
      } else {
        console.log("Reservation updated with zone information");
      }
    }

    // Create reservation tracking record
    console.log("Creating reservation tracking record");

    // Generera tracking code
    const { data: trackingCodeResult, error: trackingCodeError } = await sb.rpc(
      "generate_tracking_code",
    );
    if (trackingCodeError) {
      console.error("Failed to generate tracking code:", trackingCodeError);
    }

    const trackingCode =
      trackingCodeResult?.data || Math.random().toString().slice(2, 10);

    const { data: trackingRecord, error: trackingError } = await sb
      .from("reservation_tracking")
      .insert({
        reservation_id: reservation.id,
        customer_email: address.email,
        customer_name: address.fullName,
        tracking_code: trackingCode,
      })
      .select()
      .single();

    if (trackingError) {
      console.error("Failed to create tracking record:", trackingError);
      // Tracking failure should not break the checkout process
    } else {
      console.log("Tracking record created:", trackingRecord);
    }

    // Send order confirmation email immediately
    try {
      console.log("📧 Sending order confirmation email...");
      console.log("📧 Address data:", {
        email: address.email,
        fullName: address.fullName,
        street: address.street,
        city: address.city,
        postcode: address.postcode,
        countryCode: address.countryCode
      });
      console.log("📧 Cart data:", {
        linesCount: cart.lines.length,
        totalAmount: cart.cost.totalAmount.amount,
        currency: cart.cost.totalAmount.currencyCode
      });
      console.log("📧 Reservation ID:", reservation.id);
      
      const { sendGridService } = await import("@/lib/sendgrid-service");
      
      const emailData = {
        customerEmail: address.email,
        customerName: address.fullName,
        orderId: reservation.id,
        orderDate: new Date().toLocaleDateString(),
        items: cart.lines.map((line) => ({
          name: `${line.merchandise.product.title}`,
          quantity: line.quantity,
          price: parseFloat(line.merchandise.product.priceRange.minVariantPrice.amount),
          image: undefined,
        })),
        subtotal: parseFloat(cart.cost.totalAmount.amount),
        tax: 0,
        shipping: 0, // Will be calculated based on zones
        total: parseFloat(cart.cost.totalAmount.amount),
        shippingAddress: {
          name: address.fullName,
          street: address.street,
          city: address.city,
          postalCode: address.postcode,
          country: address.countryCode,
        },
      };
      
      console.log("📧 Prepared email data:", emailData);
      
      const emailSent = await sendGridService.sendOrderConfirmation(emailData);

      if (emailSent) {
        console.log("📧 Order confirmation email sent successfully to:", address.email);
      } else {
        console.error("📧 Failed to send order confirmation email to:", address.email);
      }
    } catch (emailError) {
      console.error("📧 Error sending order confirmation email:", emailError);
      console.error("📧 Error details:", emailError);
      // Email failure should not break the checkout process
    }

    // ============================================================
    // v2: PROGRESSION BUFFS & IP AWARDS
    // ============================================================
    
    if (currentUser) {
      try {
        console.log("💎 [PROGRESSION] Processing progression buffs and IP awards for user:", currentUser.id);
        
        // 1. Apply and mark progression buffs as used (before clearing cart)
        const buffResult = await applyProgressionBuffs(currentUser.id, reservation.id);
        if (buffResult.success && buffResult.buffCount > 0) {
          console.log(`✅ [PROGRESSION] Applied ${buffResult.buffCount} buff(s) (${buffResult.appliedPercentage}%) to order`);
        }
        
        // 2. Calculate total bottle count from cart
        const totalBottles = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
        console.log(`🍾 [PROGRESSION] Total bottles in order: ${totalBottles}`);
        
        // 3. Award IP for own order (handles both regular ≥6 and large ≥12)
        const ownOrderResult = await awardPointsForOwnOrder(
          currentUser.id,
          totalBottles,
          reservation.id
        );
        
        if (ownOrderResult.success && ownOrderResult.newTotal > 0) {
          console.log(`✅ [PROGRESSION] Awarded IP for own order. New total: ${ownOrderResult.newTotal} IP`);
          
          // 4. Check and award progression rewards at new IP milestone
          const sbAdmin = getSupabaseAdmin();
          const { data: membership } = await sbAdmin
            .from('user_memberships')
            .select('level, impact_points')
            .eq('user_id', currentUser.id)
            .single();
          
          if (membership) {
            await checkAndAwardProgressionRewards(
              currentUser.id,
              membership.impact_points,
              membership.level
            );
          }
        }
        
        // 5. Check if user was invited and this is their second order
        const { data: inviterInfo } = await sbAdmin
          .from('user_memberships')
          .select('invited_by')
          .eq('user_id', currentUser.id)
          .single();
        
        if (inviterInfo?.invited_by) {
          const secondOrderResult = await awardPointsForInviteSecondOrder(
            inviterInfo.invited_by,
            currentUser.id,
            reservation.id
          );
          
          if (secondOrderResult.success && secondOrderResult.newTotal > 0) {
            console.log(`✅ [PROGRESSION] Awarded inviter IP for friend's 2nd order`);
          }
        }
        
        // 6. Check pallet milestones (3, 6, 12 unique pallets)
        if (palletId) {
          const palletCount = await checkPalletMilestone(currentUser.id);
          console.log(`📦 [PROGRESSION] User has participated in ${palletCount} unique pallets`);
          
          // Award milestone IP if reached 3, 6, or 12
          if ([3, 6, 12].includes(palletCount)) {
            const milestoneResult = await awardPointsForPalletMilestone(
              currentUser.id,
              palletCount
            );
            
            if (milestoneResult.success && milestoneResult.newTotal > 0) {
              console.log(`🎉 [PROGRESSION] Pallet milestone ${palletCount} reached! New total: ${milestoneResult.newTotal} IP`);
            }
          }
        }
        
      } catch (progressionError) {
        console.error("❌ [PROGRESSION] Error processing progression rewards:", progressionError);
        // Don't fail the order if progression logic fails
      }
    }
    
    // Clear cart
    console.log("Clearing cart");
    await CartService.clearCart();

    // Check if pallet is now complete
    console.log("Checking if pallet completion after new reservation");
    try {
      const { checkPalletCompletion } = await import("@/lib/pallet-completion");
      const isComplete = await checkPalletCompletion(palletId);

      if (isComplete) {
        console.log(`🎉 Pallet ${palletId} is now complete! Payment notifications triggered.`);
      }
    } catch (error) {
      console.error("Error checking pallet completion:", error);
      // Don't fail the reservation if pallet completion check fails
    }

    console.log("=== CHECKOUT CONFIRM END ===");

    // Redirect to success page with reservation details
    const successUrl = `/checkout/success?success=true&reservationId=${reservation.id}&message=${encodeURIComponent("Reservation placed successfully")}`;

    return NextResponse.redirect(new URL(successUrl, request.url));
  } catch (error) {
    console.error("=== CHECKOUT CONFIRM ERROR ===");
    console.error("Checkout confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
