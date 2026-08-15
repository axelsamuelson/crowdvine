/**
 * Pallet freight quote persistence helpers (admin / service-role).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { fetchExchangeRateToSekStrict } from "@/lib/exchange-rate-strict";
import {
  calculateFreightQuoteBreakdown,
  convertFreightTotalToSekCents,
  evaluateWeightCompatibility,
  isFreightQuoteEconomicallyUsable,
  type FreightComponentInput,
  type FreightQuoteBreakdown,
  type WeightCompatibility,
} from "@/lib/freight-pricing";

export type CreatePalletFreightQuoteInput = {
  palletId: string;
  providerId: string;
  freightServiceId: string;
  freightRateId: string | null;
  transportMode: string | null;
  currency: string;
  baseAmountMajor: number | null;
  servicePricingType: "RATE_CARD" | "SPOT_QUOTE";
  serviceSpotAmountMajor?: number | null;
  palletCount?: number;
  weightKg?: number | null;
  maxWeightKg?: number | null;
  palletType?: string | null;
  components: FreightComponentInput[];
  leadTimeMinDays?: number | null;
  leadTimeMaxDays?: number | null;
  quotedAt?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  selectIfUsable?: boolean;
  origin?: string;
};

export async function buildAndPersistPalletFreightQuote(
  input: CreatePalletFreightQuoteInput,
): Promise<{
  quote: Record<string, unknown>;
  breakdown: FreightQuoteBreakdown;
}> {
  const sb = getSupabaseAdmin();
  const breakdown = calculateFreightQuoteBreakdown({
    currency: input.currency,
    baseAmountMajor: input.baseAmountMajor,
    unitType:
      input.servicePricingType === "SPOT_QUOTE" ? "SPOT_QUOTE" : "PER_PALLET",
    palletCount: input.palletCount ?? 1,
    weightKg: input.weightKg,
    components: input.components,
    serviceSpotAmountMajor: input.serviceSpotAmountMajor,
    servicePricingType: input.servicePricingType,
  });

  const weightCompatibility: WeightCompatibility = evaluateWeightCompatibility({
    maxWeightKg: input.maxWeightKg,
    actualWeightKg: input.weightKg,
  });

  let fxRateToSek: number | null = null;
  const currency = (input.currency || "EUR").toUpperCase();
  if (breakdown.canCalculate && breakdown.subtotalAmountMinor != null) {
    if (currency === "SEK") {
      fxRateToSek = 1;
    } else {
      const fx = await fetchExchangeRateToSekStrict(currency, input.origin);
      fxRateToSek = fx?.rate ?? null;
    }
  }

  const totalCostSekCents = convertFreightTotalToSekCents({
    currency,
    totalAmountMinor: breakdown.subtotalAmountMinor,
    fxRateToSek,
  });

  const economicallyUsable = isFreightQuoteEconomicallyUsable({
    canCalculate: breakdown.canCalculate && fxRateToSek != null,
    totalCostSekCents,
    weightCompatibility,
  });

  const status = economicallyUsable
    ? "QUOTED"
    : breakdown.requiresSpotQuote || !breakdown.canCalculate
      ? "INCOMPLETE"
      : fxRateToSek == null
        ? "INCOMPLETE"
        : "ESTIMATED";

  const quoteSnapshot = {
    schema_version: 1,
    provider_id: input.providerId,
    freight_service_id: input.freightServiceId,
    freight_rate_id: input.freightRateId,
    transport_mode: input.transportMode,
    currency,
    base_amount_major: input.baseAmountMajor,
    base_amount_minor: breakdown.baseAmountMinor,
    pallet_count: input.palletCount ?? 1,
    weight_kg: input.weightKg ?? null,
    max_weight_kg: input.maxWeightKg ?? null,
    pallet_type: input.palletType ?? null,
    service_pricing_type: input.servicePricingType,
    components: breakdown.components,
    subtotal_amount_minor: breakdown.subtotalAmountMinor,
    fx_rate_to_sek: fxRateToSek,
    total_cost_sek_cents: totalCostSekCents,
    calculated_at: new Date().toISOString(),
  };

  const { data: row, error } = await sb
    .from("pallet_freight_quotes")
    .insert({
      pallet_id: input.palletId,
      provider_id: input.providerId,
      freight_service_id: input.freightServiceId,
      freight_rate_id: input.freightRateId,
      status,
      transport_mode: input.transportMode,
      currency,
      base_amount_minor: breakdown.baseAmountMinor,
      weight_kg: input.weightKg ?? null,
      pallet_count: input.palletCount ?? 1,
      pallet_type: input.palletType ?? null,
      component_snapshot: breakdown.components,
      quote_snapshot: quoteSnapshot,
      total_amount_minor: breakdown.subtotalAmountMinor,
      fx_rate_to_sek: fxRateToSek,
      total_cost_sek_cents: totalCostSekCents,
      quoted_at: input.quotedAt ?? new Date().toISOString(),
      valid_until: input.validUntil ?? null,
      lead_time_min_days: input.leadTimeMinDays ?? null,
      lead_time_max_days: input.leadTimeMaxDays ?? null,
      selected: false,
      can_calculate: breakdown.canCalculate,
      requires_spot_quote: breakdown.requiresSpotQuote,
      economically_usable: economicallyUsable,
      weight_compatibility: weightCompatibility,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !row) {
    throw new Error(error?.message || "Failed to create freight quote");
  }

  if (input.selectIfUsable && economicallyUsable) {
    await selectPalletFreightQuote(input.palletId, String(row.id));
    const { data: refreshed } = await sb
      .from("pallet_freight_quotes")
      .select("*")
      .eq("id", row.id)
      .single();
    return { quote: refreshed ?? row, breakdown };
  }

  return { quote: row, breakdown };
}

export async function selectPalletFreightQuote(
  palletId: string,
  quoteId: string,
): Promise<void> {
  const sb = getSupabaseAdmin();

  const { data: quote, error } = await sb
    .from("pallet_freight_quotes")
    .select("id, pallet_id, economically_usable, total_cost_sek_cents")
    .eq("id", quoteId)
    .eq("pallet_id", palletId)
    .maybeSingle();

  if (error || !quote) {
    throw new Error(error?.message || "Quote not found");
  }
  if (
    quote.economically_usable !== true ||
    !(Number(quote.total_cost_sek_cents) > 0)
  ) {
    throw new Error(
      "Quote is not economically usable (missing amount, FX, or incompatible)",
    );
  }

  await sb
    .from("pallet_freight_quotes")
    .update({ selected: false, status: "QUOTED" })
    .eq("pallet_id", palletId)
    .eq("selected", true);

  const { error: selErr } = await sb
    .from("pallet_freight_quotes")
    .update({ selected: true, status: "SELECTED" })
    .eq("id", quoteId);

  if (selErr) throw new Error(selErr.message);

  const { error: palletErr } = await sb
    .from("pallets")
    .update({ selected_inbound_freight_quote_id: quoteId })
    .eq("id", palletId);

  if (palletErr) throw new Error(palletErr.message);
}
