/**
 * Shared checkout helper: resolve customer shipping SEK from canonical quote.
 * Prefer configured customer_shipping_rates; fall back to legacy amortization.
 */

import { quotePactCustomerShipping } from "@/lib/customer-shipping-quote-server";
import { customerShippingQuoteToSekMajor } from "@/lib/customer-shipping-pricing";

export async function resolveCheckoutShippingSek(input: {
  bottleCount: number;
  countryCode?: string | null;
  productSubtotalSek?: number;
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

  const quote = await quotePactCustomerShipping({
    bottleCount: bottles,
    countryCode: input.countryCode ?? "SE",
    productSubtotalGrossCents: subtotalCents,
    allowLegacyFallback: true,
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
