/**
 * Shared checkout helper: resolve customer shipping SEK from canonical quote.
 * Prefer configured customer_shipping_rates; fall back to legacy amortization.
 *
 * Quote, payment-intent, confirm, and deferred charge must use the same country
 * and the same charge gate so shown and charged shipping never diverge.
 */

import { quotePactCustomerShipping } from "@/lib/customer-shipping-quote-server";
import { customerShippingQuoteToSekMajor } from "@/lib/customer-shipping-pricing";

/** ISO-3166 alpha-2 or null when missing/invalid (never invent "SE"). */
export function normalizeCheckoutShippingCountry(
  raw: string | null | undefined,
): string | null {
  const cc = String(raw ?? "")
    .trim()
    .toUpperCase();
  return cc.length === 2 ? cc : null;
}

/**
 * Country used for customer shipping rates on checkout money paths.
 * Prefer the delivery/address country when present; otherwise the active zone.
 * Confirm already requires delivery === active zone before charging.
 */
export function resolveCheckoutShippingCountry(input: {
  deliveryCountry?: string | null;
  activeZoneCountry?: string | null;
}): string | null {
  return (
    normalizeCheckoutShippingCountry(input.deliveryCountry) ??
    normalizeCheckoutShippingCountry(input.activeZoneCountry)
  );
}

export async function resolveCheckoutShippingSek(input: {
  bottleCount: number;
  countryCode?: string | null;
  productSubtotalSek?: number;
  /** Checkout passes false so a missing country rate is not replaced by pallet amortization. */
  allowLegacyFallback?: boolean;
  pallet: {
    cost_cents?: number | null;
    bottle_capacity?: number | null;
    last_mile_cost_cents_per_bottle?: number | null;
  } | null;
}): Promise<{
  shippingSek: number;
  shippingGrossCents: number;
  source: string;
  complete: boolean;
  freeShipping: boolean;
  reason: string;
}> {
  const bottles = Math.max(0, Math.floor(input.bottleCount));
  const subtotalCents = Math.max(
    0,
    Math.round((Number(input.productSubtotalSek) || 0) * 100),
  );
  // Do not default to "SE" here — a missing country must not pick up Sweden's rate.
  const countryCode = normalizeCheckoutShippingCountry(input.countryCode);
  if (!countryCode) {
    return {
      shippingSek: 0,
      shippingGrossCents: 0,
      source: "missing_config",
      complete: false,
      freeShipping: false,
      reason: "Missing checkout shipping country",
    };
  }

  const quote = await quotePactCustomerShipping({
    bottleCount: bottles,
    countryCode,
    productSubtotalGrossCents: subtotalCents,
    allowLegacyFallback: input.allowLegacyFallback !== false,
    legacyPallet: input.pallet
      ? {
          costCents: Number(input.pallet.cost_cents) || 0,
          bottleCapacity: Number(input.pallet.bottle_capacity) || 0,
          lastMileCostCentsPerBottle:
            input.pallet.last_mile_cost_cents_per_bottle,
        }
      : null,
  });

  return {
    shippingSek: customerShippingQuoteToSekMajor(quote),
    shippingGrossCents: quote.grossCents,
    source: quote.source,
    complete: quote.complete,
    freeShipping: quote.freeShipping,
    reason: quote.reason,
  };
}

/**
 * What checkout may charge. A configured rate is charged.
 * Anything else, including the Sweden rate applied to another country and
 * legacy pallet amortization, is excluded from the total.
 */
export function checkoutCustomerShippingCharge(resolved: {
  source: string;
  shippingSek: number;
}): { shippingSek: number; shippingPending: boolean } {
  if (
    resolved.source === "configured_flat" ||
    resolved.source === "configured_free"
  ) {
    return {
      shippingSek: Math.max(0, resolved.shippingSek),
      shippingPending: false,
    };
  }
  return { shippingSek: 0, shippingPending: true };
}

export type CheckoutShippingChargeResult = {
  shippingSek: number;
  shippingPending: boolean;
  source: string;
  reason: string;
  countryCode: string | null;
};

/**
 * Single entry used by quote / payment-intent / confirm / auto-charge.
 * Resolves country, loads the rate for that country only, and applies the
 * charge gate (pending when no configured rate row exists).
 */
export async function resolveAndChargeCheckoutShipping(input: {
  bottleCount: number;
  productSubtotalSek?: number;
  deliveryCountry?: string | null;
  activeZoneCountry?: string | null;
  /** Explicit override when callers already normalized the country. */
  countryCode?: string | null;
  pallet: {
    cost_cents?: number | null;
    bottle_capacity?: number | null;
    last_mile_cost_cents_per_bottle?: number | null;
  } | null;
}): Promise<CheckoutShippingChargeResult> {
  const countryCode =
    normalizeCheckoutShippingCountry(input.countryCode) ??
    resolveCheckoutShippingCountry({
      deliveryCountry: input.deliveryCountry,
      activeZoneCountry: input.activeZoneCountry,
    });

  if (!countryCode) {
    return {
      shippingSek: 0,
      shippingPending: true,
      source: "missing_config",
      reason: "Missing checkout shipping country",
      countryCode: null,
    };
  }

  const resolved = await resolveCheckoutShippingSek({
    bottleCount: input.bottleCount,
    productSubtotalSek: input.productSubtotalSek,
    countryCode,
    allowLegacyFallback: false,
    pallet: input.pallet,
  });
  const charge = checkoutCustomerShippingCharge(resolved);
  return {
    shippingSek: charge.shippingSek,
    shippingPending: charge.shippingPending,
    source: resolved.source,
    reason: resolved.reason,
    countryCode,
  };
}
