/**
 * Progressive address step helpers for checkout.
 *
 * Keeps seed/clear and panel selection pure so the "Laddar vinzon…" stuck
 * state (draft cleared while a field still has focus) can be unit-tested
 * without mounting the full checkout client.
 */

/** Whether the zone-row seed effect should null out `deliveryDraft`. */
export function shouldClearDeliveryDraftOnSeed(args: {
  hasCompleteZoneRow: boolean;
  contactOk: boolean;
  editingAddress: boolean;
  addressFieldFocused: boolean;
}): boolean {
  return (
    args.hasCompleteZoneRow &&
    args.contactOk &&
    !args.editingAddress &&
    !args.addressFieldFocused
  );
}

export type AddressStepPanel = "summary" | "form" | "loading";

/**
 * Which UI the address section should show once postal/delivery preview
 * gates have already passed.
 */
export function resolveAddressStepPanel(args: {
  addressStepComplete: boolean;
  editingAddress: boolean;
  addressFieldFocused: boolean;
  hasDeliveryDraft: boolean;
}): AddressStepPanel {
  if (
    args.addressStepComplete &&
    !args.editingAddress &&
    !args.addressFieldFocused
  ) {
    return "summary";
  }
  if (args.hasDeliveryDraft) {
    return "form";
  }
  return "loading";
}

/**
 * If the form unmounts without blur (draft cleared while focused), the focus
 * flag would stick true forever and pin the loading spinner. Callers must
 * reset focus when this returns true.
 */
export function shouldResetAddressFocusWhenDraftMissing(args: {
  hasDeliveryDraft: boolean;
  addressFieldFocused: boolean;
}): boolean {
  return !args.hasDeliveryDraft && args.addressFieldFocused;
}
