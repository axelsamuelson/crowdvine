import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";

export {
  PALLET_FILL_STATUSES,
  ORDER_RESERVATION_STATUSES_FOR_PALLET_FILL,
  getPalletFillData,
  sumReservedBottlesOnPallet,
} from "@/lib/pallet-fill-count";

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

    if (pallet.is_complete) {
      console.log(`✅ [Pallet Completion] Pallet ${palletId} already complete`);
      return false;
    }

    const capacity = Number(pallet.bottle_capacity) || 0;
    const totalBottles = await sumReservedBottlesOnPallet(palletId);
    const percentage = capacity > 0 ? (totalBottles / capacity) * 100 : 0;

    console.log(
      `📊 [Pallet Completion] Pallet ${palletId}: ${totalBottles}/${capacity} bottles (${percentage.toFixed(1)}%)`,
    );

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
        throw error;
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

async function completePallet(palletId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    const paymentDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    console.log(
      `📧 [Pallet Completion] Step 1: Updating reservations for pallet ${palletId}`,
    );

    const { error: reservationUpdateError } = await supabase
      .from("order_reservations")
      .update({
        status: "pending_payment",
        payment_deadline: paymentDeadline.toISOString(),
      })
      .eq("pallet_id", palletId)
      .in("status", ["placed", "approved", "partly_approved", "pending_payment"]);

    if (reservationUpdateError) {
      console.error(
        `❌ [Pallet Completion] Error updating reservations for pallet ${palletId}:`,
        reservationUpdateError,
      );
      throw reservationUpdateError;
    }
    console.log(
      `✅ [Pallet Completion] Updated payment deadline for all pending reservations in pallet ${palletId}`,
    );

    // Charge is no longer triggered by pallet completion.
    // Payment is triggered when admin marks the pallet as
    // 'shipping_ordered' via POST /api/admin/pallets/[id]/order-shipping
    // See lib/reservation-auto-charge.ts for the charge logic.

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
    throw error;
  }
}

export async function getPalletStatus(palletId: string) {
  const supabase = getSupabaseAdmin();

  try {
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("*")
      .eq("id", palletId)
      .single();

    if (palletError || !pallet) {
      throw new Error(`Pallet ${palletId} not found`);
    }

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
