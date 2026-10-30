/**
 * Pallet-based shared-preorder vs direct-box (decision f837d0e1).
 *
 * Today B2C still attaches a `pallet_id` for fill accounting while customer
 * copy promises a direct box. True non-pallet orders will set
 * `fulfillment_channel = 'direct_box'` (or leave `pallet_id` null).
 * Keep this helper as the single exclusion point for 90-day / extension cron.
 */
export type PalletBasedReservationInput = {
  pallet_id?: string | null;
  /** Future column / metadata; `direct_box` is never pallet-based. */
  fulfillment_channel?: string | null;
};

export function isPalletBasedReservation(
  row: PalletBasedReservationInput,
): boolean {
  const channel = String(row.fulfillment_channel ?? "")
    .trim()
    .toLowerCase();
  if (channel === "direct_box" || channel === "direct-box") {
    return false;
  }

  const palletId =
    typeof row.pallet_id === "string" ? row.pallet_id.trim() : "";
  return palletId.length > 0;
}
