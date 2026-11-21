/**
 * Order-summary shipping / Leverans row display (checkout step 1).
 * Pure rules — always resolve to a concrete state after postal is known
 * so the row never disappears behind an endless skeleton.
 */

export type CheckoutShippingSummaryReason =
  | "out_of_zone"
  | "budbee_unavailable"
  | "no_fulfillment"
  | "no_rate";

export type CheckoutShippingSummaryDisplay =
  | { kind: "after_postal" }
  | { kind: "loading" }
  | { kind: "amount"; shippingSek: number }
  | { kind: "free" }
  | { kind: "unavailable"; reason: CheckoutShippingSummaryReason };

/**
 * Resolve what the summary shipping (Leverans/Frakt) row should show.
 *
 * Cause of the Kiruna gap: postals outside the shared-pallet geo zone
 * (`out_of_zone` / NO_DELIVERY_ZONE) often leave `shippingSek` null once the
 * selected channel cannot quote. The UI used to keep a skeleton whenever
 * `hasPostalCode` was true — so the row looked missing. After load settles
 * we always return amount, free, or unavailable copy.
 */
export function resolveCheckoutShippingSummaryDisplay(input: {
  hasPostalCode: boolean;
  loading: boolean;
  shippingSek: number | null | undefined;
  /** Selected channel cannot fulfill this postal (shared out of zone, etc.). */
  channelUnavailable?: boolean;
  sharedUnavailableReason?:
    | null
    | "out_of_zone"
    | "budbee_unavailable"
    | "unsupported_country";
  noFulfillmentAvailable?: boolean;
}): CheckoutShippingSummaryDisplay {
  if (!input.hasPostalCode) return { kind: "after_postal" };
  if (input.loading) return { kind: "loading" };

  const sek = input.shippingSek;
  const hasAmount = typeof sek === "number" && Number.isFinite(sek);

  if (input.noFulfillmentAvailable) {
    return { kind: "unavailable", reason: "no_fulfillment" };
  }

  if (input.channelUnavailable) {
    if (input.sharedUnavailableReason === "budbee_unavailable") {
      return { kind: "unavailable", reason: "budbee_unavailable" };
    }
    if (
      input.sharedUnavailableReason === "out_of_zone" ||
      input.sharedUnavailableReason === "unsupported_country"
    ) {
      return { kind: "unavailable", reason: "out_of_zone" };
    }
    return { kind: "unavailable", reason: "out_of_zone" };
  }

  if (hasAmount && sek === 0) return { kind: "free" };
  if (hasAmount) return { kind: "amount", shippingSek: sek };

  return { kind: "unavailable", reason: "no_rate" };
}

/** Map unavailable reason → checkout i18n key (under `checkout.`). */
export function shippingSummaryUnavailableMessageKey(
  reason: CheckoutShippingSummaryReason,
):
  | "sharedPalletPostalUnavailable"
  | "sharedPalletPostalBudbeeUnavailable"
  | "shippingNotAvailable"
  | "shippingUnavailableForPostal" {
  switch (reason) {
    case "budbee_unavailable":
      return "sharedPalletPostalBudbeeUnavailable";
    case "out_of_zone":
      return "sharedPalletPostalUnavailable";
    case "no_fulfillment":
      // Short label in the Frakt row — the red explanation under delivery
      // options carries the full "we don't deliver yet" copy once.
      return "shippingNotAvailable";
    case "no_rate":
      return "shippingUnavailableForPostal";
  }
}

/**
 * Helper under a disabled purchase CTA when postal is still missing.
 * Returns an i18n key or null when another reason already explains the disable.
 */
export function checkoutCtaMissingPostalHintKey(input: {
  hasPostalCode: boolean;
  /** When true, cart minimum copy already covers the disable. */
  cartMinimumBlocks?: boolean;
}): "fillPostalToContinue" | null {
  if (input.cartMinimumBlocks) return null;
  if (!input.hasPostalCode) return "fillPostalToContinue";
  return null;
}

/**
 * Order-summary Totalt when Frakt cannot be offered/quoted.
 * Never keep a stale shared-pallet fee (e.g. 99) in the total once the
 * shipping row is unavailable — show subtotal (exkl. frakt) instead.
 */
export function resolveCheckoutSummaryTotalSek(input: {
  shippingSummary: CheckoutShippingSummaryDisplay;
  /** Channel-bound quote total when shipping is part of that quote. */
  boundQuoteTotalSek?: number | null;
  subtotalSek: number;
  shippingSek: number | null | undefined;
  pactPointsSekOff?: number;
  promoDiscountSek?: number;
}): { amountSek: number | null; exclShipping: boolean } {
  const pact = Math.max(0, Number(input.pactPointsSekOff) || 0);
  const promo = Math.max(0, Number(input.promoDiscountSek) || 0);
  const subtotalNet = Math.max(0, input.subtotalSek - pact - promo);

  if (
    input.shippingSummary.kind === "after_postal" ||
    input.shippingSummary.kind === "loading"
  ) {
    return { amountSek: null, exclShipping: false };
  }

  if (input.shippingSummary.kind === "unavailable") {
    return { amountSek: subtotalNet, exclShipping: true };
  }

  if (
    typeof input.boundQuoteTotalSek === "number" &&
    Number.isFinite(input.boundQuoteTotalSek)
  ) {
    return { amountSek: input.boundQuoteTotalSek, exclShipping: false };
  }

  const sek = input.shippingSek;
  if (typeof sek !== "number" || !Number.isFinite(sek)) {
    return { amountSek: subtotalNet, exclShipping: true };
  }
  return {
    amountSek: Math.max(0, input.subtotalSek + sek - pact - promo),
    exclShipping: false,
  };
}
