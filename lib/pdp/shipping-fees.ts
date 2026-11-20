/**
 * PDP shipping lines. Same resolver and rate rows as checkout.
 * Amounts are never invented here — a missing row yields null.
 */

import { unstable_cache } from "next/cache";

import { PDP_REVALIDATE_SECONDS } from "@/lib/crowdvine/pdp-static-params";
import { PDP_PRODUCT_CACHE_TAG } from "@/lib/crowdvine/revalidate-wine-storefront";
import {
  resolveCustomerShippingQuote,
  type CustomerShippingQuote,
  type CustomerShippingRateRow,
} from "@/lib/customer-shipping-pricing";
import { loadCustomerShippingRates } from "@/lib/customer-shipping-quote-server";

export type PdpShippingFees = {
  /** shared_pallet → pact row, flat fee per order. */
  pactPerOrderSek: number | null;
  /** direct_box row, fee for one box of 6. */
  directBoxPerBoxSek: number | null;
};

const EMPTY_FEES: PdpShippingFees = {
  pactPerOrderSek: null,
  directBoxPerBoxSek: null,
};

function configuredFlatSek(quote: CustomerShippingQuote): number | null {
  if (!quote.complete || quote.source !== "configured_flat") return null;
  if (!Number.isFinite(quote.grossCents) || quote.grossCents <= 0) return null;
  return quote.grossCents / 100;
}

/** Pure. `bottleCount` 6 so direct_box resolves to one box. */
export function pdpShippingFeesFromRates(
  rates: CustomerShippingRateRow[],
): PdpShippingFees {
  const shared = {
    countryCode: "SE",
    bottleCount: 6,
    rates,
    allowLegacyFallback: false,
  };
  return {
    pactPerOrderSek: configuredFlatSek(
      resolveCustomerShippingQuote({ ...shared, channel: "pact" }),
    ),
    directBoxPerBoxSek: configuredFlatSek(
      resolveCustomerShippingQuote({ ...shared, channel: "direct_box" }),
    ),
  };
}

export async function loadPdpShippingFees(): Promise<PdpShippingFees> {
  try {
    const rates = await loadCustomerShippingRates();
    return pdpShippingFeesFromRates(rates);
  } catch {
    return EMPTY_FEES;
  }
}

/**
 * Cached like the PDP product payload (`unstable_cache`, same revalidate window
 * and product tag) so a price change busts the shipping lines too.
 */
export async function getCachedPdpShippingFees(): Promise<PdpShippingFees> {
  if (process.env.NODE_ENV === "development") {
    return loadPdpShippingFees();
  }
  const readThrough = unstable_cache(
    loadPdpShippingFees,
    ["pdp-shipping-fees", "v1"],
    {
      revalidate: PDP_REVALIDATE_SECONDS,
      tags: [PDP_PRODUCT_CACHE_TAG],
    },
  );
  try {
    return await readThrough();
  } catch {
    return EMPTY_FEES;
  }
}
