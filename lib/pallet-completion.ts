import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { triggerPaymentNotifications } from "@/lib/email/pallet-complete";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import {
  isPalletShippingLocked,
  resolveMinBottlesToShip,
} from "@/lib/pallet-ship-progress";

export {
  PALLET_FILL_STATUSES,
  ORDER_RESERVATION_STATUSES_FOR_PALLET_FILL,
  getPalletFillData,
  sumReservedBottlesOnPallet,
} from "@/lib/pallet-fill-count";

/**
 * Pure decision for ship-readiness sync (testable without DB).
 * Live rule: bottlesFilled >= minBottlesToShip. Economics / completion_rules
 * must never influence this decision.
 */
export type ShipReadinessSyncDecision =
  | { action: "noop"; isReady: boolean; becameReady: false; reverted: false }
  | { action: "locked"; isReady: boolean; becameReady: false; reverted: false }
  | { action: "complete"; isReady: true; becameReady: true; reverted: false }
  | {
      action: "revert";
      isReady: false;
      becameReady: false;
      reverted: true;
      nextStatus: string | null;
    };

export function decidePalletShipReadinessSync(input: {
  status: string | null | undefined;
  currentlyComplete: boolean;
  bottlesFilled: number;
  minBottlesToShip: number;
  statusMode?: string | null;
}): ShipReadinessSyncDecision {
  const status = String(input.status ?? "").toLowerCase();
  if (isPalletShippingLocked(status)) {
    return {
      action: "locked",
      isReady: Boolean(input.currentlyComplete),
      becameReady: false,
      reverted: false,
    };
  }

  const minToShip = resolveMinBottlesToShip(input.minBottlesToShip);
  const filled = Math.max(0, Math.floor(Number(input.bottlesFilled) || 0));
  const shouldBeReady = filled >= minToShip;
  const currentlyComplete = Boolean(input.currentlyComplete);

  if (shouldBeReady && !currentlyComplete) {
    return {
      action: "complete",
      isReady: true,
      becameReady: true,
      reverted: false,
    };
  }

  if (shouldBeReady && currentlyComplete) {
    return {
      action: "noop",
      isReady: true,
      becameReady: false,
      reverted: false,
    };
  }

  if (!shouldBeReady && currentlyComplete) {
    const mode =
      typeof input.statusMode === "string" ? input.statusMode : "auto";
    const nextStatus =
      mode === "manual" ? null : filled > 0 ? "consolidating" : "open";
    return {
      action: "revert",
      isReady: false,
      becameReady: false,
      reverted: true,
      nextStatus,
    };
  }

  return {
    action: "noop",
    isReady: false,
    becameReady: false,
    reverted: false,
  };
}

/**
 * Sync pallet ship-readiness from live fill count.
 *
 * - `complete` / `is_complete` means "enough bottles for ship eligibility"
 *   (min_bottles_to_complete), not physically full.
 * - Before shipping_ordered: may complete or revert when fill crosses the threshold.
 * - After shipping_ordered (and later lifecycle): never auto-revert.
 *
 * Decision: reuse existing `complete` / `is_complete` rather than adding
 * `ready_to_ship` — those flags already mean "ready for payment/shipping ops".
 */
export async function syncPalletShipReadiness(
  palletId: string,
): Promise<{ becameReady: boolean; reverted: boolean; isReady: boolean }> {
  console.log(`🔍 [Pallet Completion] Syncing ship readiness for ${palletId}`);

  const supabase = getSupabaseAdmin();
  const noop = { becameReady: false, reverted: false, isReady: false };

  try {
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select(
        "bottle_capacity, min_bottles_to_complete, status, is_complete, status_mode",
      )
      .eq("id", palletId)
      .single();

    if (palletError || !pallet) {
      console.error(
        `❌ [Pallet Completion] Error fetching pallet ${palletId}:`,
        palletError,
      );
      return noop;
    }

    const minToShip = resolveMinBottlesToShip(pallet.min_bottles_to_complete);
    const totalBottles = await sumReservedBottlesOnPallet(palletId);
    const decision = decidePalletShipReadinessSync({
      status: pallet.status,
      currentlyComplete: Boolean(pallet.is_complete),
      bottlesFilled: totalBottles,
      minBottlesToShip: minToShip,
      statusMode: pallet.status_mode,
    });

    console.log(
      `📊 [Pallet Completion] Pallet ${palletId}: ${totalBottles}/${minToShip} bottles to ship (physical cap ${pallet.bottle_capacity}) action=${decision.action}`,
    );

    if (decision.action === "locked" || decision.action === "noop") {
      return {
        becameReady: decision.becameReady,
        reverted: decision.reverted,
        isReady: decision.isReady,
      };
    }

    if (decision.action === "complete") {
      await completePallet(palletId);
      if (process.env.PALLET_AUTO_NOTIFICATIONS === "true") {
        try {
          await triggerPaymentNotifications(palletId);
        } catch (emailError) {
          console.error(
            `⚠️ [Pallet Completion] Payment notifications failed for pallet ${palletId}:`,
            emailError,
          );
        }
      } else {
        console.log(
          `⏸️ [Pallet Completion] Auto-notifications disabled — trigger manually from admin for pallet ${palletId}`,
        );
      }
      return { becameReady: true, reverted: false, isReady: true };
    }

    // revert
    const { error: revertError } = await supabase
      .from("pallets")
      .update({
        is_complete: false,
        completed_at: null,
        payment_deadline: null,
        ...(decision.nextStatus ? { status: decision.nextStatus } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", palletId);

    if (revertError) {
      console.error(
        `❌ [Pallet Completion] Failed to revert pallet ${palletId}:`,
        revertError,
      );
      return { becameReady: false, reverted: false, isReady: true };
    }

    await supabase
      .from("order_reservations")
      .update({
        payment_deadline: null,
      })
      .eq("pallet_id", palletId)
      .eq("status", "pending_payment")
      .is("payment_intent_id", null);

    console.log(
      `↩️ [Pallet Completion] Pallet ${palletId} reverted below ship threshold (${totalBottles}/${minToShip})`,
    );
    return { becameReady: false, reverted: true, isReady: false };
  } catch (error) {
    console.error(
      `❌ [Pallet Completion] Unexpected error syncing pallet ${palletId}:`,
      error,
    );
    return noop;
  }
}

/**
 * Check if a pallet has reached ship-ready threshold and trigger completion.
 * @returns true when the pallet newly became ready in this call
 */
export async function checkPalletCompletion(
  palletId: string,
): Promise<boolean> {
  const result = await syncPalletShipReadiness(palletId);
  return result.becameReady;
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
      `✅ [Pallet Completion] Updated payment deadline for eligible reservations in pallet ${palletId}`,
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
      `✅ [Pallet Completion] Pallet ${palletId} marked ready to ship (complete) with deadline ${paymentDeadline.toISOString()}`,
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

    const minToShip = resolveMinBottlesToShip(
      (pallet as { min_bottles_to_complete?: number }).min_bottles_to_complete,
    );
    stats.percentage =
      minToShip > 0 ? (stats.total / minToShip) * 100 : 0;

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

/**
 * Read-only diagnostic: pre-shipping pallets where persisted `is_complete`
 * disagrees with canonical bottle readiness. Does not mutate.
 */
export async function findStalePreShippingPalletReadiness(): Promise<
  Array<{
    palletId: string;
    name: string;
    status: string | null;
    persistedIsComplete: boolean;
    bottlesFilled: number;
    minBottlesToShip: number;
    canonicalIsReady: boolean;
  }>
> {
  const sb = getSupabaseAdmin();
  const { data: pallets, error } = await sb
    .from("pallets")
    .select(
      "id, name, status, is_complete, min_bottles_to_complete, bottle_capacity",
    );

  if (error || !pallets?.length) return [];

  const stale: Array<{
    palletId: string;
    name: string;
    status: string | null;
    persistedIsComplete: boolean;
    bottlesFilled: number;
    minBottlesToShip: number;
    canonicalIsReady: boolean;
  }> = [];

  for (const pallet of pallets) {
    if (isPalletShippingLocked(pallet.status)) continue;
    const minToShip = resolveMinBottlesToShip(pallet.min_bottles_to_complete);
    const bottlesFilled = await sumReservedBottlesOnPallet(pallet.id);
    const canonicalIsReady = bottlesFilled >= minToShip;
    const persistedIsComplete = Boolean(pallet.is_complete);
    if (persistedIsComplete !== canonicalIsReady) {
      stale.push({
        palletId: pallet.id,
        name: String(pallet.name ?? ""),
        status: typeof pallet.status === "string" ? pallet.status : null,
        persistedIsComplete,
        bottlesFilled,
        minBottlesToShip: minToShip,
        canonicalIsReady,
      });
    }
  }

  return stale;
}
