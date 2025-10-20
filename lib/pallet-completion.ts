import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Check if a pallet has reached completion (100% capacity)
 * and trigger completion process if so
 */
export async function checkPalletCompletion(
  palletId: string,
): Promise<boolean> {
  console.log(`🔍 [Pallet Completion] Checking pallet ${palletId}`);

  const supabase = getSupabaseAdmin();

  try {
    // Get pallet capacity and current status
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("bottle_capacity, status, is_complete")
      .eq("id", palletId)
      .single();

    if (palletError) {
      console.error(
        `❌ [Pallet Completion] Error fetching pallet ${palletId}:`,
        palletError,
      );
      return false;
    }

    if (!pallet) {
      console.error(`❌ [Pallet Completion] Pallet ${palletId} not found`);
      return false;
    }

    // Skip if already complete
    if (pallet.is_complete) {
      console.log(`✅ [Pallet Completion] Pallet ${palletId} already complete`);
      return false;
    }

    // Count reserved bottles for this pallet
    // Note: quantity is stored in order_reservation_items, not order_reservations
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select("id, status")
      .eq("pallet_id", palletId)
      .in("status", ["placed", "pending_payment", "confirmed"]); // Include all active statuses

    if (reservationsError) {
      console.error(
        `❌ [Pallet Completion] Error fetching reservations for pallet ${palletId}:`,
        reservationsError,
      );
      return false;
    }

    // Count bottles from order_reservation_items for each reservation
    let totalBottles = 0;
    for (const reservation of reservations || []) {
      const { data: items } = await supabase
        .from("order_reservation_items")
        .select("quantity")
        .eq("reservation_id", reservation.id);

      totalBottles +=
        items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    }
    const capacity = pallet.bottle_capacity;
    const percentage = capacity > 0 ? (totalBottles / capacity) * 100 : 0;

    console.log(
      `📊 [Pallet Completion] Pallet ${palletId}: ${totalBottles}/${capacity} bottles (${percentage.toFixed(1)}%)`,
    );

    // Check if pallet is full or over capacity
    if (totalBottles >= capacity) {
      console.log(
        `🎉 [Pallet Completion] Pallet ${palletId} is complete! Triggering completion...`,
      );
      try {
        await completePallet(palletId);
        console.log(
          `✅ [Pallet Completion] Successfully completed pallet ${palletId}`,
        );
        return true;
      } catch (error) {
        console.error(
          `❌ [Pallet Completion] Failed to complete pallet ${palletId}:`,
          error,
        );
        throw error; // Re-throw to see error in API response
      }
    }

    console.log(`ℹ️ [Pallet Completion] Pallet ${palletId} not full yet`);
    return false;
  } catch (error) {
    console.error(
      `❌ [Pallet Completion] Unexpected error checking pallet ${palletId}:`,
      error,
    );
    return false;
  }
}

/**
 * Mark pallet as complete and trigger payment notifications
 */
async function completePallet(palletId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    const paymentDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    console.log(
      `📧 [Pallet Completion] Step 1: Updating reservations for pallet ${palletId}`,
    );

    // FIRST: Update all pending reservations to have payment deadline and set status to pending_payment
    const { error: reservationUpdateError } = await supabase
      .from("order_reservations")
      .update({
        status: "pending_payment",
        payment_deadline: paymentDeadline.toISOString(),
      })
      .eq("pallet_id", palletId)
      .in("status", ["placed", "pending_payment"]);

    if (reservationUpdateError) {
      console.error(
        `❌ [Pallet Completion] Error updating reservations for pallet ${palletId}:`,
        reservationUpdateError,
      );
      throw reservationUpdateError;
    } else {
      console.log(
        `✅ [Pallet Completion] Updated payment deadline for all pending reservations in pallet ${palletId}`,
      );
    }

    console.log(
      `📧 [Pallet Completion] Step 2: Triggering payment notifications for pallet ${palletId}`,
    );

    // SECOND: Trigger payment notifications (this creates Stripe links and sends emails)
    await triggerPaymentNotifications(palletId);

    console.log(
      `✅ [Pallet Completion] Step 3: All payment notifications sent successfully`,
    );

    // THIRD: Only mark pallet as complete AFTER everything else succeeds
    const { error: updateError } = await supabase
      .from("pallets")
      .update({
        status: "complete",
        is_complete: true,
        completed_at: new Date().toISOString(),
        payment_deadline: paymentDeadline.toISOString(),
      })
      .eq("id", palletId);

    if (updateError) {
      console.error(
        `❌ [Pallet Completion] Error updating pallet ${palletId}:`,
        updateError,
      );
      throw updateError;
    }

    console.log(
      `✅ [Pallet Completion] Pallet ${palletId} marked as complete with deadline ${paymentDeadline.toISOString()}`,
    );
  } catch (error) {
    console.error(
      `❌ [Pallet Completion] Error completing pallet ${palletId}:`,
      error,
    );
    // Don't mark as complete if there was an error
    throw error;
  }
}

/**
 * Trigger payment notifications for all pending reservations in a completed pallet
 */
async function triggerPaymentNotifications(palletId: string): Promise<void> {
  try {
    // Import here to avoid circular dependencies
    const { triggerPaymentNotifications } = await import(
      "@/lib/email/pallet-complete"
    );
    await triggerPaymentNotifications(palletId);
  } catch (error) {
    console.error(
      `❌ [Pallet Completion] Error triggering payment notifications for pallet ${palletId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Get pallet completion status and statistics
 */
export async function getPalletStatus(palletId: string) {
  const supabase = getSupabaseAdmin();

  try {
    // Get pallet info
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("*")
      .eq("id", palletId)
      .single();

    if (palletError || !pallet) {
      throw new Error(`Pallet ${palletId} not found`);
    }

    // Get reservation counts by status
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select("status, quantity")
      .eq("pallet_id", palletId);

    if (reservationsError) {
      throw new Error(
        `Error fetching reservations: ${reservationsError.message}`,
      );
    }

    const stats = {
      pending: 0,
      confirmed: 0,
      total: 0,
      percentage: 0,
    };

    reservations?.forEach((reservation) => {
      if (reservation.status === "pending_payment") {
        stats.pending += reservation.quantity;
      } else if (reservation.status === "confirmed") {
        stats.confirmed += reservation.quantity;
      }
      stats.total += reservation.quantity;
    });

    stats.percentage =
      pallet.bottle_capacity > 0
        ? (stats.total / pallet.bottle_capacity) * 100
        : 0;

    return {
      pallet,
      stats,
      isComplete: pallet.is_complete,
      needsPayment: stats.pending > 0 && pallet.is_complete,
    };
  } catch (error) {
    console.error(
      `❌ [Pallet Status] Error getting status for pallet ${palletId}:`,
      error,
    );
    throw error;
  }
}
