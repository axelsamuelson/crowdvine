/**
 * Which reservations the pallet-close flow owns (vs reservation-expiry cron).
 * Close flow owns shared-pallet SI lifecycle when enabled; once a row has
 * entered pallet_close_state it stays owned even if flags flip off.
 */

import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";

export type PalletCloseOwnershipRow = {
  pallet_id?: string | null;
  fulfillment_channel?: string | null;
  payment_mode?: string | null;
  pallet_close_state?: string | null;
};

/**
 * True when reservation-expiry must skip this row (close flow owns lifecycle).
 */
export function isReservationOwnedByPalletCloseFlow(
  row: PalletCloseOwnershipRow,
  opts: {
    palletCloseFlowEnabled?: boolean;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  } = {},
): boolean {
  if (!isPalletBasedReservation(row)) return false;

  const state = String(row.pallet_close_state ?? "").trim();
  if (state.length > 0) {
    // Already in the close-flow state machine — never double-handle.
    return true;
  }

  const enabled =
    opts.palletCloseFlowEnabled ??
    isPalletCloseFlowEnabled(opts.env ?? process.env);
  if (!enabled) return false;

  const mode = String(row.payment_mode ?? "")
    .trim()
    .toLowerCase();
  // Shared-pallet SetupIntent path (default when mode unset on legacy rows).
  return mode === "" || mode === "setup_intent";
}
