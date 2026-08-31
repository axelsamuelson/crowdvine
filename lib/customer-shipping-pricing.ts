/**
 * Canonical PACT customer shipping REVENUE pricing.
 *
 * Separate from:
 * - outbound carrier COST (Instabee / Budbee quotes)
 * - inbound pallet freight (GM3)
 *
 * Never amortize pallet.cost_cents / capacity here for the configured path.
 */

import { DEFAULT_VAT_RATE } from "@/lib/contribution-assumptions";
import { grossToNetCents } from "@/lib/pallet-contribution";

export type CustomerShippingChannel = "pact";

export type CustomerShippingSource =
  | "configured_flat"
  | "configured_free"
  | "legacy_pallet_amortization"
  | "missing_config";

export type CustomerShippingQuote = {
  grossCents: number;
  netCents: number;
  currency: "SEK";
  vatRate: number;
  source: CustomerShippingSource;
  reason: string;
  freeShipping: boolean;
  /** True when a deliberate commercial rule resolved (configured or explicit free). */
  complete: boolean;
};

export type CustomerShippingRateRow = {
  id: string;
  channel: CustomerShippingChannel;
  countryCode: string | null;
  flatFeeCents: number;
  freeShipping: boolean;
  freeShippingThresholdCents: number | null;
  minBottles: number | null;
  maxBottles: number | null;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
};

export type LegacyPalletShippingInput = {
  costCents: number;
  bottleCapacity: number;
  lastMileCostCentsPerBottle: number;
  bottles: number;
};

/**
 * Pure resolver. Prefer an active configured rate; otherwise return incomplete
 * or (when allowLegacyFallback) the deprecated amortization formula.
 */
export function resolveCustomerShippingQuote(input: {
  channel?: CustomerShippingChannel;
  countryCode?: string | null;
  bottleCount: number;
  /** Product subtotal in öre (gross) for free-shipping threshold. */
  productSubtotalGrossCents?: number;
  rates: CustomerShippingRateRow[];
  vatRate?: number;
  /** Keep current live totals until a rate is configured. */
  allowLegacyFallback?: boolean;
  legacy?: LegacyPalletShippingInput | null;
  now?: Date;
}): CustomerShippingQuote {
  const vatRate = input.vatRate ?? DEFAULT_VAT_RATE;
  const bottles = Math.max(0, Math.floor(input.bottleCount));
  const channel = input.channel ?? "pact";
  const now = input.now ?? new Date();
  const country = (input.countryCode || "SE").toUpperCase();

  const active = input.rates.filter((r) => {
    if (!r.active) return false;
    if (r.channel !== channel) return false;
    if (r.countryCode && r.countryCode.toUpperCase() !== country) return false;
    if (r.minBottles != null && bottles < r.minBottles) return false;
    if (r.maxBottles != null && bottles > r.maxBottles) return false;
    if (r.validFrom && new Date(r.validFrom) > now) return false;
    if (r.validTo && new Date(r.validTo) < now) return false;
    return true;
  });

  // Prefer country-specific over null country
  active.sort((a, b) => {
    const ac = a.countryCode ? 1 : 0;
    const bc = b.countryCode ? 1 : 0;
    return bc - ac;
  });

  const rate = active[0];
  if (rate) {
    const subtotal = Math.max(0, Math.round(input.productSubtotalGrossCents ?? 0));
    const freeByThreshold =
      rate.freeShippingThresholdCents != null &&
      rate.freeShippingThresholdCents > 0 &&
      subtotal >= rate.freeShippingThresholdCents;

    if (rate.freeShipping || freeByThreshold) {
      return {
        grossCents: 0,
        netCents: 0,
        currency: "SEK",
        vatRate,
        source: "configured_free",
        reason: rate.freeShipping
          ? "Configured free shipping"
          : `Free shipping threshold ${rate.freeShippingThresholdCents} öre met`,
        freeShipping: true,
        complete: true,
      };
    }

    const gross = Math.max(0, Math.round(rate.flatFeeCents));
    return {
      grossCents: gross,
      netCents: grossToNetCents(gross, true, vatRate),
      currency: "SEK",
      vatRate,
      source: "configured_flat",
      reason: `Configured flat fee ${gross} öre`,
      freeShipping: false,
      complete: true,
    };
  }

  if (input.allowLegacyFallback && input.legacy) {
    const legacyGross = legacyAmortizedShippingGrossCents(input.legacy);
    return {
      grossCents: legacyGross,
      netCents: grossToNetCents(legacyGross, true, vatRate),
      currency: "SEK",
      vatRate,
      source: "legacy_pallet_amortization",
      reason:
        "No active customer_shipping_rates row; using deprecated cost_cents/capacity + last-mile",
      freeShipping: legacyGross === 0,
      complete: false,
    };
  }

  return {
    grossCents: 0,
    netCents: 0,
    currency: "SEK",
    vatRate,
    source: "missing_config",
    reason: "No active customer shipping rate configured",
    freeShipping: false,
    complete: false,
  };
}

/** Deprecated formula — only for transitional fallback. */
export function legacyAmortizedShippingGrossCents(
  legacy: LegacyPalletShippingInput,
): number {
  const capacity = Math.max(0, Math.floor(legacy.bottleCapacity));
  const bottles = Math.max(0, Math.floor(legacy.bottles));
  const cost = Math.max(0, Math.round(legacy.costCents));
  const lastMile = Math.max(0, Math.round(legacy.lastMileCostCentsPerBottle));
  if (bottles <= 0) return 0;
  const linehaulPer =
    capacity > 0 ? Math.round(cost / capacity) : 0;
  return (linehaulPer + lastMile) * bottles;
}

export function customerShippingQuoteToSekMajor(quote: CustomerShippingQuote): number {
  return Math.round(quote.grossCents) / 100;
}

/**
 * Allocate checkout shipping gross across reservation bottle weights.
 * Conserves total öre (largest remainder).
 */
export function allocateCustomerShippingByBottles(
  shippingGrossCents: number,
  bottleWeights: number[],
): number[] {
  const pool = Math.max(0, Math.round(shippingGrossCents));
  const weights = bottleWeights.map((w) => Math.max(0, Math.floor(w)));
  const n = weights.length;
  if (n === 0) return [];
  const totalW = weights.reduce((a, b) => a + b, 0);
  if (pool === 0 || totalW <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (w / totalW) * pool);
  const floors = exact.map((x) => Math.floor(x));
  let rem = pool - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let idx = 0;
  while (rem > 0 && idx < order.length) {
    out[order[idx]!.i]! += 1;
    rem -= 1;
    idx += 1;
  }
  return out;
}
