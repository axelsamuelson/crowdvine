/**
 * Pure checkout shipping label rules (display only).
 * Amounts are SEK major units from the customer shipping resolver —
 * format with formatSekAsDisplayMoney / useDisplayMoney().formatSek, never
 * formatDisplayMoney (that stamps 99 SEK as "$99.0" in a USD context).
 */

export type CheckoutShippingLabelKind =
  | "pending"
  | "free"
  | "amount"
  | "none";

export type CheckoutShippingLabelState =
  | { kind: "pending" }
  | { kind: "free" }
  | { kind: "amount"; shippingSek: number }
  | { kind: "none" };

/**
 * Decide what the checkout shipping row should show.
 * - pending: no configured rate for the country → explanatory copy, not an amount
 * - free: configured free (or zero configured flat)
 * - amount: configured flat fee in SEK (caller converts/formats with currency)
 * - none: no pallet / no quote yet
 */
export function resolveCheckoutShippingLabelState(input: {
  hasPallet: boolean;
  shippingPending?: boolean | null;
  shippingSek?: number | null;
}): CheckoutShippingLabelState {
  if (!input.hasPallet) return { kind: "none" };
  if (input.shippingPending === true) return { kind: "pending" };
  if (input.shippingSek == null || !Number.isFinite(input.shippingSek)) {
    return { kind: "none" };
  }
  if (input.shippingSek === 0) return { kind: "free" };
  return { kind: "amount", shippingSek: input.shippingSek };
}

/**
 * Map label state to a display string using caller-supplied copy + SEK formatter.
 */
export function formatCheckoutShippingLabel(
  state: CheckoutShippingLabelState,
  opts: {
    pendingLabel: string;
    freeLabel: string;
    /** Convert SEK major → shopper display currency string (e.g. formatSek). */
    formatSek: (shippingSek: number) => string;
  },
): string | null {
  switch (state.kind) {
    case "pending":
      return opts.pendingLabel;
    case "free":
      return opts.freeLabel;
    case "amount":
      return opts.formatSek(state.shippingSek);
    case "none":
      return null;
  }
}
