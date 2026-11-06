/**
 * Load active customer shipping rates (service role / admin).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveLastMileCostCentsPerBottle } from "@/lib/shipping-calculations";
import {
  resolveCustomerShippingQuote,
  type CustomerShippingQuote,
  type CustomerShippingRateRow,
  type LegacyPalletShippingInput,
} from "@/lib/customer-shipping-pricing";

function mapRate(row: Record<string, unknown>): CustomerShippingRateRow {
  const rawChannel = String(row.channel ?? "pact")
    .trim()
    .toLowerCase();
  const channel: CustomerShippingRateRow["channel"] =
    rawChannel === "direct_box" ? "direct_box" : "pact";
  return {
    id: String(row.id),
    channel,
    countryCode: row.country_code != null ? String(row.country_code) : null,
    flatFeeCents: Math.round(Number(row.flat_fee_cents) || 0),
    freeShipping: row.free_shipping === true,
    freeShippingThresholdCents:
      row.free_shipping_threshold_cents == null
        ? null
        : Math.round(Number(row.free_shipping_threshold_cents)),
    minBottles:
      row.min_bottles == null ? null : Math.floor(Number(row.min_bottles)),
    maxBottles:
      row.max_bottles == null ? null : Math.floor(Number(row.max_bottles)),
    active: row.active !== false,
    validFrom: row.valid_from != null ? String(row.valid_from) : null,
    validTo: row.valid_to != null ? String(row.valid_to) : null,
  };
}

export async function loadCustomerShippingRates(): Promise<CustomerShippingRateRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("customer_shipping_rates")
    .select("*")
    .eq("active", true);
  if (error) {
    // Table may not exist until migration 206
    console.warn("[customer-shipping] load rates:", error.message);
    return [];
  }
  return (data ?? []).map((r) => mapRate(r as Record<string, unknown>));
}

export async function quotePactCustomerShipping(input: {
  bottleCount: number;
  countryCode?: string | null;
  productSubtotalGrossCents?: number;
  /**
   * Rate-table channel. Default `pact` (shared_pallet).
   * Pass `direct_box` for mode-scoped direct quotes — never falls back to pact/99 SEK.
   */
  channel?: CustomerShippingRateRow["channel"];
  legacyPallet?: {
    costCents: number;
    bottleCapacity: number;
    lastMileCostCentsPerBottle?: number | null;
  } | null;
  /** Default true until business configures an authoritative rate. */
  allowLegacyFallback?: boolean;
}): Promise<CustomerShippingQuote> {
  const rates = await loadCustomerShippingRates();
  const channel = input.channel === "direct_box" ? "direct_box" : "pact";
  const allowLegacy =
    channel === "direct_box" ? false : input.allowLegacyFallback !== false;

  let legacy: LegacyPalletShippingInput | null = null;
  if (channel !== "direct_box" && input.legacyPallet) {
    legacy = {
      costCents: input.legacyPallet.costCents,
      bottleCapacity: input.legacyPallet.bottleCapacity,
      lastMileCostCentsPerBottle: resolveLastMileCostCentsPerBottle(
        input.legacyPallet.lastMileCostCentsPerBottle,
      ),
      bottles: input.bottleCount,
    };
  }

  return resolveCustomerShippingQuote({
    channel,
    countryCode: input.countryCode ?? "SE",
    bottleCount: input.bottleCount,
    productSubtotalGrossCents: input.productSubtotalGrossCents,
    rates,
    allowLegacyFallback: allowLegacy,
    legacy,
  });
}
