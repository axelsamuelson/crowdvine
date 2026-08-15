/**
 * Resolve Instabee/Budbee Light outbound catalogue + persist checkout quotes.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  budbeeLightSwedenRateCard,
  calculateOutboundFreightQuoteBreakdown,
  isRemoteAreaBlockedForCountry,
  type OutboundFreightQuoteBreakdown,
  type OutboundRateCard,
  type OutboundSurchargeInput,
} from "@/lib/outbound-freight-pricing";

export const INSTABEE_PROVIDER_CODE = "INSTABEE";
export const BUDBEE_LIGHT_SE_SERVICE_NAME =
  "Budbee Light Home Delivery – Sweden";

export type PackagingProfileRow = {
  id: string;
  code: string;
  name: string;
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  tare_weight_kg: number | null;
  max_bottles: number | null;
  min_bottles: number | null;
  active: boolean;
};

export type OutboundCatalogueRate = {
  providerId: string;
  providerCode: string;
  serviceId: string;
  serviceName: string;
  rateId: string;
  rate: OutboundRateCard;
  surcharges: OutboundSurchargeInput[];
  validTo: string | null;
};

function majorToOre(major: number | null | undefined): number {
  if (major == null || !Number.isFinite(Number(major))) return 0;
  return Math.round(Number(major) * 100);
}

export async function loadActiveBudbeeLightSwedenRate(
  asOfDate?: string,
): Promise<OutboundCatalogueRate | null> {
  const sb = getSupabaseAdmin();
  const asOf = (asOfDate || new Date().toISOString().slice(0, 10)).slice(0, 10);

  const { data: provider } = await sb
    .from("logistics_providers")
    .select("id, code, name")
    .eq("code", INSTABEE_PROVIDER_CODE)
    .eq("active", true)
    .maybeSingle();
  if (!provider) return null;

  const { data: service } = await sb
    .from("freight_services")
    .select("id, name, destination_country, direction, active")
    .eq("provider_id", provider.id)
    .eq("direction", "OUTBOUND")
    .eq("active", true)
    .ilike("name", "%Budbee Light%")
    .maybeSingle();
  if (!service) return null;

  const { data: rateRow } = await sb
    .from("freight_rates")
    .select("*")
    .eq("freight_service_id", service.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!rateRow) return null;

  if (rateRow.valid_to && String(rateRow.valid_to).slice(0, 10) < asOf) {
    return null; // expired — do not use as live rate
  }

  const { data: comps } = await sb
    .from("freight_rate_components")
    .select("*")
    .eq("freight_rate_id", rateRow.id)
    .order("sort_order");

  const fallback = budbeeLightSwedenRateCard();
  const rate: OutboundRateCard = {
    currency: String(rateRow.currency || "SEK"),
    basePriceCents: majorToOre(rateRow.base_price_amount) || fallback.basePriceCents,
    includedWeightKg:
      Number(rateRow.included_weight_kg) > 0
        ? Number(rateRow.included_weight_kg)
        : fallback.includedWeightKg,
    weightIncrementKg:
      Number(rateRow.weight_increment_kg) > 0
        ? Number(rateRow.weight_increment_kg)
        : fallback.weightIncrementKg,
    incrementPriceCents:
      majorToOre(rateRow.increment_price_amount) || fallback.incrementPriceCents,
    pricingBasis:
      (rateRow.pricing_basis as OutboundRateCard["pricingBasis"]) ||
      "VOLUMETRIC_WEIGHT",
    volumetricFactor:
      Number(rateRow.volumetric_factor) > 0
        ? Number(rateRow.volumetric_factor)
        : 280,
    validTo: rateRow.valid_to ? String(rateRow.valid_to).slice(0, 10) : null,
    destinationCountry: service.destination_country || "SE",
  };

  const surcharges: OutboundSurchargeInput[] = (comps ?? []).map((c) => {
    const code = String(c.code || c.name || "").toUpperCase();
    const calc =
      c.calculation_type === "PER_PICKUP"
        ? "PER_PICKUP"
        : c.calculation_type === "FIXED"
          ? "FIXED"
          : "PER_PARCEL";
    return {
      code,
      name: String(c.name),
      amountCentsPerUnit: majorToOre(c.value),
      calculationType: calc,
      selected: false,
      blockedForDestination: isRemoteAreaBlockedForCountry(code, "SE"),
    };
  });

  return {
    providerId: String(provider.id),
    providerCode: String(provider.code || INSTABEE_PROVIDER_CODE),
    serviceId: String(service.id),
    serviceName: String(service.name),
    rateId: String(rateRow.id),
    rate,
    surcharges,
    validTo: rate.validTo,
  };
}

export async function loadDefaultPackagingProfile(): Promise<PackagingProfileRow | null> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("packaging_profiles")
    .select("*")
    .eq("active", true)
    .eq("code", "WINE_BOX_6")
    .maybeSingle();
  return (data as PackagingProfileRow) ?? null;
}

export type CreateOutboundQuoteInput = {
  checkoutGroupId: string | null;
  idempotencyKey: string | null;
  destinationCountry: string;
  destinationPostalCode?: string | null;
  bottleCount: number;
  selectedSurchargeCodes?: string[];
  asOfDate?: string;
};

export type PersistedOutboundQuoteResult = {
  quoteId: string | null;
  breakdown: OutboundFreightQuoteBreakdown;
  catalogue: OutboundCatalogueRate | null;
  packaging: PackagingProfileRow | null;
  economicallyUsable: boolean;
  /** Prefer actual_total if adjustments exist, else estimated. */
  effectiveTotalCents: number | null;
};

/**
 * Idempotent: reuses existing quote for checkout_group_id / idempotency_key.
 */
export async function createOrGetOutboundFreightQuote(
  input: CreateOutboundQuoteInput,
): Promise<PersistedOutboundQuoteResult> {
  const sb = getSupabaseAdmin();

  if (input.idempotencyKey) {
    const { data: existing } = await sb
      .from("outbound_freight_quotes")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return mapExistingQuote(existing);
    }
  }
  if (input.checkoutGroupId) {
    const { data: existing } = await sb
      .from("outbound_freight_quotes")
      .select("*")
      .eq("checkout_group_id", input.checkoutGroupId)
      .maybeSingle();
    if (existing) {
      return mapExistingQuote(existing);
    }
  }

  const catalogue = await loadActiveBudbeeLightSwedenRate(input.asOfDate);
  const packaging = await loadDefaultPackagingProfile();

  const selected = new Set(
    (input.selectedSurchargeCodes ?? []).map((c) => c.toUpperCase()),
  );

  if (!catalogue) {
    const breakdown: OutboundFreightQuoteBreakdown = {
      currency: "SEK",
      parcelCount: 0,
      actualWeightKg: null,
      volumetricWeightKg: null,
      roundedVolumetricWeightKg: null,
      chargeableWeightKg: null,
      baseAmountCents: null,
      weightIncrementAmountCents: null,
      components: [],
      totalAmountCents: null,
      canCalculate: false,
      incompleteReasons: [
        "No active Instabee Budbee Light Sweden rate (missing or expired)",
      ],
    };
    const row = await insertIncompleteQuote(input, breakdown, null, packaging);
    return {
      quoteId: row?.id ?? null,
      breakdown,
      catalogue: null,
      packaging,
      economicallyUsable: false,
      effectiveTotalCents: null,
    };
  }

  const surcharges = catalogue.surcharges.map((s) => ({
    ...s,
    selected: selected.has(s.code.toUpperCase()),
    blockedForDestination: isRemoteAreaBlockedForCountry(
      s.code,
      input.destinationCountry,
    ),
  }));

  const breakdown = calculateOutboundFreightQuoteBreakdown({
    rate: catalogue.rate,
    destinationCountry: input.destinationCountry,
    bottleCount: input.bottleCount,
    maxBottlesPerParcel: packaging?.max_bottles ?? null,
    lengthM: packaging?.length_m != null ? Number(packaging.length_m) : null,
    widthM: packaging?.width_m != null ? Number(packaging.width_m) : null,
    heightM: packaging?.height_m != null ? Number(packaging.height_m) : null,
    actualWeightKg: null,
    asOfDate: input.asOfDate,
    surcharges,
  });

  const economicallyUsable =
    breakdown.canCalculate &&
    breakdown.totalAmountCents != null &&
    breakdown.totalAmountCents > 0;

  const quoteSnapshot = {
    schema_version: 1,
    provider_code: catalogue.providerCode,
    provider_id: catalogue.providerId,
    service_id: catalogue.serviceId,
    service_name: catalogue.serviceName,
    rate_id: catalogue.rateId,
    packaging_profile_id: packaging?.id ?? null,
    packaging_code: packaging?.code ?? null,
    destination_country: input.destinationCountry,
    rate: catalogue.rate,
    breakdown,
    customer_shipping_note:
      "Customer shipping revenue is separate from this carrier cost",
    calculated_at: new Date().toISOString(),
  };

  const { data: row, error } = await sb
    .from("outbound_freight_quotes")
    .insert({
      checkout_group_id: input.checkoutGroupId,
      idempotency_key: input.idempotencyKey,
      provider_id: catalogue.providerId,
      freight_service_id: catalogue.serviceId,
      freight_rate_id: catalogue.rateId,
      packaging_profile_id: packaging?.id ?? null,
      status: economicallyUsable ? "ESTIMATED" : "INCOMPLETE",
      destination_country: input.destinationCountry.toUpperCase(),
      destination_postal_code: input.destinationPostalCode ?? null,
      parcel_count: breakdown.parcelCount || null,
      bottle_count: input.bottleCount,
      actual_weight_kg: breakdown.actualWeightKg,
      volumetric_weight_kg: breakdown.volumetricWeightKg,
      rounded_volumetric_weight_kg: breakdown.roundedVolumetricWeightKg,
      chargeable_weight_kg: breakdown.chargeableWeightKg,
      weight_basis: catalogue.rate.pricingBasis,
      currency: breakdown.currency,
      base_amount_minor: breakdown.baseAmountCents,
      weight_increment_amount_minor: breakdown.weightIncrementAmountCents,
      component_snapshot: breakdown.components,
      quote_snapshot: quoteSnapshot,
      estimated_total_minor: breakdown.totalAmountCents,
      adjustments_total_minor: 0,
      actual_total_minor: economicallyUsable ? breakdown.totalAmountCents : null,
      valid_until: catalogue.validTo
        ? `${catalogue.validTo}T23:59:59.000Z`
        : null,
      can_calculate: breakdown.canCalculate,
      economically_usable: economicallyUsable,
      incomplete_reasons: breakdown.incompleteReasons,
    })
    .select("*")
    .single();

  if (error) {
    // Race on unique idempotency / checkout_group
    if (input.idempotencyKey) {
      const { data: raced } = await sb
        .from("outbound_freight_quotes")
        .select("*")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (raced) return mapExistingQuote(raced);
    }
    throw new Error(error.message);
  }

  return {
    quoteId: String(row.id),
    breakdown,
    catalogue,
    packaging,
    economicallyUsable,
    effectiveTotalCents: economicallyUsable ? breakdown.totalAmountCents : null,
  };
}

async function insertIncompleteQuote(
  input: CreateOutboundQuoteInput,
  breakdown: OutboundFreightQuoteBreakdown,
  catalogue: OutboundCatalogueRate | null,
  packaging: PackagingProfileRow | null,
) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("outbound_freight_quotes")
    .insert({
      checkout_group_id: input.checkoutGroupId,
      idempotency_key: input.idempotencyKey,
      provider_id: catalogue?.providerId ?? null,
      freight_service_id: catalogue?.serviceId ?? null,
      freight_rate_id: catalogue?.rateId ?? null,
      packaging_profile_id: packaging?.id ?? null,
      status: "INCOMPLETE",
      destination_country: input.destinationCountry.toUpperCase(),
      destination_postal_code: input.destinationPostalCode ?? null,
      bottle_count: input.bottleCount,
      currency: "SEK",
      component_snapshot: [],
      quote_snapshot: { incompleteReasons: breakdown.incompleteReasons },
      can_calculate: false,
      economically_usable: false,
      incomplete_reasons: breakdown.incompleteReasons,
    })
    .select("id")
    .maybeSingle();
  return data;
}

function mapExistingQuote(row: Record<string, unknown>): PersistedOutboundQuoteResult {
  const estimated = row.estimated_total_minor != null
    ? Number(row.estimated_total_minor)
    : null;
  const actual =
    row.actual_total_minor != null ? Number(row.actual_total_minor) : null;
  const adjustments = Number(row.adjustments_total_minor) || 0;
  const effective =
    actual != null
      ? actual
      : estimated != null
        ? estimated + adjustments
        : null;
  const usable = row.economically_usable === true && effective != null && effective > 0;
  const breakdown = (row.quote_snapshot as { breakdown?: OutboundFreightQuoteBreakdown })
    ?.breakdown ?? {
    currency: String(row.currency || "SEK"),
    parcelCount: Number(row.parcel_count) || 0,
    actualWeightKg: row.actual_weight_kg != null ? Number(row.actual_weight_kg) : null,
    volumetricWeightKg:
      row.volumetric_weight_kg != null ? Number(row.volumetric_weight_kg) : null,
    roundedVolumetricWeightKg:
      row.rounded_volumetric_weight_kg != null
        ? Number(row.rounded_volumetric_weight_kg)
        : null,
    chargeableWeightKg:
      row.chargeable_weight_kg != null ? Number(row.chargeable_weight_kg) : null,
    baseAmountCents:
      row.base_amount_minor != null ? Number(row.base_amount_minor) : null,
    weightIncrementAmountCents:
      row.weight_increment_amount_minor != null
        ? Number(row.weight_increment_amount_minor)
        : null,
    components: [],
    totalAmountCents: estimated,
    canCalculate: row.can_calculate === true,
    incompleteReasons: (row.incomplete_reasons as string[]) || [],
  };

  return {
    quoteId: String(row.id),
    breakdown,
    catalogue: null,
    packaging: null,
    economicallyUsable: usable,
    effectiveTotalCents: usable ? effective : null,
  };
}

/**
 * Effective outbound cost for contribution:
 * actual (with adjustments) if finalized/known, else frozen estimate.
 */
export function resolveEffectiveOutboundTotalCents(quote: {
  estimated_total_minor?: number | null;
  actual_total_minor?: number | null;
  adjustments_total_minor?: number | null;
  economically_usable?: boolean;
}): number | null {
  if (quote.economically_usable === false) return null;
  if (quote.actual_total_minor != null && Number.isFinite(Number(quote.actual_total_minor))) {
    return Math.round(Number(quote.actual_total_minor));
  }
  const est = quote.estimated_total_minor;
  if (est == null || !Number.isFinite(Number(est))) return null;
  return Math.round(Number(est) + (Number(quote.adjustments_total_minor) || 0));
}
