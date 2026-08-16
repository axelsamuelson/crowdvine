/**
 * Canonical PACT admin pallet operating summary (Phase 2D).
 * Single source for list + detail: fill, ship-ready, physical, shadow economics, freight target source.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import {
  computePalletShipProgress,
  resolveMinBottlesToShip,
  resolvePhysicalBottleCapacity,
} from "@/lib/pallet-ship-progress";
import {
  computePalletContributionProgress,
  resolveFreightTargetCents,
} from "@/lib/pallet-contribution";
import { loadDefaultPackagingProfile, loadActiveBudbeeLightSwedenRate } from "@/lib/outbound-freight-quotes";

export type FreightTargetSource =
  | "manual_override"
  | "selected_quote"
  | "legacy_cost"
  | "none";

/** Aggregated P/L lines from frozen unit economics snapshots (detail only). */
export type ContributionEconomicsBreakdown = {
  bottlesWithSnapshot: number;
  bottlesWithoutSnapshot: number;
  /** Product gross revenue (öre), qty × unit_gross */
  productGrossRevenueCents: number;
  productNetRevenueCents: number;
  discountCents: number;
  shippingRevenueGrossCents: number;
  shippingRevenueNetCents: number;
  purchaseCostCents: number;
  exciseCents: number;
  paymentFeeCents: number;
  lastMileCostCents: number;
  eprCents: number;
  refundReserveCents: number;
  prePalletContributionCents: number;
  /**
   * GM1 = product net − purchase − excise (product margin before fulfillment OpEx).
   * Inbound pallet freight is not included.
   */
  gm1Cents: number;
  /**
   * GM2 = GM1 + shipping net − payment − last-mile − EPR − refund
   * (= pre-pallet contribution). Still before inbound pallet freight target.
   */
  gm2Cents: number;
  /** True when any snapshotted bottle was marked incomplete. */
  hasIncompleteUnitSnapshots: boolean;
};

/** Derive GM1 / GM2 from rolled-up snapshot lines. */
export function deriveContributionMargins(input: {
  productNetRevenueCents: number;
  shippingRevenueNetCents: number;
  purchaseCostCents: number;
  exciseCents: number;
  paymentFeeCents: number;
  lastMileCostCents: number;
  eprCents: number;
  refundReserveCents: number;
}): { gm1Cents: number; gm2Cents: number } {
  const gm1Cents =
    Math.round(input.productNetRevenueCents) -
    Math.round(input.purchaseCostCents) -
    Math.round(input.exciseCents);
  const gm2Cents =
    gm1Cents +
    Math.round(input.shippingRevenueNetCents) -
    Math.round(input.paymentFeeCents) -
    Math.round(input.lastMileCostCents) -
    Math.round(input.eprCents) -
    Math.round(input.refundReserveCents);
  return { gm1Cents, gm2Cents };
}

export type AdminPalletOperatingSummary = {
  palletId: string;
  name: string;

  bottlesFilled: number;
  minBottlesToShip: number;
  bottlesRemainingToShip: number;
  shipProgressPercent: number;
  isReadyToShip: boolean;

  physicalBottleCapacity: number;
  physicalBottlesRemaining: number;
  physicalUtilizationPercent: number;

  operationalStatus: string | null;
  shippingOrderedAt: string | null;

  economics: {
    bottlesWithSnapshot: number;
    accumulatedContributionCents: number;
    freightTargetCents: number;
    freightTargetSource: FreightTargetSource;
    freightFundedPercent: number;
    remainingContributionCents: number;
    expectedContributionPerBottleCents: number | null;
    isEconomicallyReady: boolean;
    hasIncompleteSnapshots: boolean;
    estimatedBottlesRemaining: number | null;
  };

  /** Full revenue/cost rollup from snapshots — populated on detail summary only. */
  economicsBreakdown: ContributionEconomicsBreakdown | null;

  inbound: {
    providerName: string | null;
    serviceName: string | null;
    quoteId: string | null;
    currency: string | null;
    totalOriginalMinor: number | null;
    totalSekCents: number | null;
    economicallyUsable: boolean;
  };

  outbound: {
    providerName: string | null;
    serviceName: string | null;
    packagingCode: string | null;
    packagingConfigured: boolean;
    incompleteQuoteCount: number;
    usableQuoteCount: number;
    /** ISO date or null when no live rate. */
    rateValidTo: string | null;
    /** ASSUMPTION | VERIFIED | UNKNOWN for Home volumetric factor. */
    volumetricFactorProvenance: "ASSUMPTION" | "VERIFIED" | "UNKNOWN";
    primaryIncompleteReason: string | null;
  };

  warnings: string[];
};

export function resolveFreightTargetSource(pallet: {
  freight_target_cents?: number | null;
  cost_cents?: number | null;
  selectedQuoteSekCents?: number | null;
}): FreightTargetSource {
  const override = Number(pallet.freight_target_cents);
  if (Number.isFinite(override) && override > 0) return "manual_override";
  const quote = Number(pallet.selectedQuoteSekCents);
  if (Number.isFinite(quote) && quote > 0) return "selected_quote";
  const legacy = Number(pallet.cost_cents);
  if (Number.isFinite(legacy) && legacy > 0) return "legacy_cost";
  return "none";
}

export function buildWarnings(input: {
  needsPalletZone?: boolean;
  pickupIsFallback?: boolean;
  bottlesFilled?: number;
  economics: AdminPalletOperatingSummary["economics"];
  inbound: AdminPalletOperatingSummary["inbound"];
  outbound: AdminPalletOperatingSummary["outbound"];
}): string[] {
  const w: string[] = [];
  if (input.needsPalletZone) {
    w.push("No pallet-zone producer assigned yet");
  } else if (input.pickupIsFallback) {
    w.push("Ships-from producer is not marked as a pallet zone");
  }
  if (input.economics.hasIncompleteSnapshots && input.economics.bottlesWithSnapshot > 0) {
    w.push("Partial contribution economics snapshots");
  } else if (
    input.economics.bottlesWithSnapshot === 0 &&
    input.economics.freightTargetCents > 0 &&
    (input.bottlesFilled ?? 0) > 0
  ) {
    w.push(
      "No contribution economics snapshots on fill-eligible bottles (shadow stays 0% until backfilled or new checkouts)",
    );
  }
  if (input.economics.freightTargetSource === "legacy_cost") {
    w.push("Using legacy pallet freight estimate (no selected inbound quote)");
  }
  if (!input.inbound.quoteId && input.economics.freightTargetSource !== "manual_override") {
    w.push("No selected inbound freight quote");
  }
  if (!input.outbound.packagingConfigured) {
    w.push("Outbound packaging profile incomplete (box dimensions not configured)");
  }
  if (input.outbound.incompleteQuoteCount > 0) {
    w.push(
      `${input.outbound.incompleteQuoteCount} outbound freight quote(s) incomplete`,
    );
  }
  return w;
}

type AggregateMaps = {
  bottlesByPalletId: Map<string, number>;
  snapshotBottlesByPalletId: Map<string, number>;
  contributionByPalletId: Map<string, number>;
  selectedQuoteByPalletId: Map<
    string,
    {
      id: string;
      total_cost_sek_cents: number | null;
      total_amount_minor: number | null;
      currency: string | null;
      economically_usable: boolean;
      providerName: string | null;
      serviceName: string | null;
    }
  >;
  outboundByPalletId: Map<
    string,
    { incomplete: number; usable: number }
  >;
};

async function loadAggregateMaps(
  palletIds: string[],
): Promise<AggregateMaps> {
  const sb = getSupabaseAdmin();
  const bottlesByPalletId = new Map<string, number>();
  const snapshotBottlesByPalletId = new Map<string, number>();
  const contributionByPalletId = new Map<string, number>();
  const selectedQuoteByPalletId = new Map<
    string,
    {
      id: string;
      total_cost_sek_cents: number | null;
      total_amount_minor: number | null;
      currency: string | null;
      economically_usable: boolean;
      providerName: string | null;
      serviceName: string | null;
    }
  >();
  const outboundByPalletId = new Map<string, { incomplete: number; usable: number }>();

  if (palletIds.length === 0) {
    return {
      bottlesByPalletId,
      snapshotBottlesByPalletId,
      contributionByPalletId,
      selectedQuoteByPalletId,
      outboundByPalletId,
    };
  }

  const { data: reservations } = await sb
    .from("order_reservations")
    .select("id, pallet_id")
    .in("pallet_id", palletIds)
    .in("status", [...PALLET_FILL_STATUSES]);

  const reservationIdToPalletId = new Map<string, string>();
  for (const r of reservations ?? []) {
    if (r.pallet_id && r.id) reservationIdToPalletId.set(r.id, r.pallet_id);
  }

  const reservationIds = [...reservationIdToPalletId.keys()];
  if (reservationIds.length > 0) {
    const { data: items } = await sb
      .from("order_reservation_items")
      .select(
        "reservation_id, quantity, pre_pallet_contribution_cents, outbound_freight_quote_id",
      )
      .in("reservation_id", reservationIds);

    const outboundQuoteIds = new Set<string>();
    for (const it of items ?? []) {
      const palletId = reservationIdToPalletId.get(it.reservation_id);
      if (!palletId) continue;
      const qty = Math.max(0, Math.floor(Number(it.quantity) || 0));
      bottlesByPalletId.set(
        palletId,
        (bottlesByPalletId.get(palletId) ?? 0) + qty,
      );
      const contrib = it.pre_pallet_contribution_cents;
      if (contrib != null && Number.isFinite(Number(contrib))) {
        snapshotBottlesByPalletId.set(
          palletId,
          (snapshotBottlesByPalletId.get(palletId) ?? 0) + qty,
        );
        contributionByPalletId.set(
          palletId,
          (contributionByPalletId.get(palletId) ?? 0) + Math.round(Number(contrib)),
        );
      }
      if (it.outbound_freight_quote_id) {
        outboundQuoteIds.add(String(it.outbound_freight_quote_id));
      }
    }

    if (outboundQuoteIds.size > 0) {
      const { data: oq } = await sb
        .from("outbound_freight_quotes")
        .select("id, economically_usable, can_calculate, status")
        .in("id", [...outboundQuoteIds]);

      // Map quote → pallets via items
      const quoteToPallets = new Map<string, Set<string>>();
      for (const it of items ?? []) {
        if (!it.outbound_freight_quote_id) continue;
        const pid = reservationIdToPalletId.get(it.reservation_id);
        if (!pid) continue;
        const qid = String(it.outbound_freight_quote_id);
        const set = quoteToPallets.get(qid) ?? new Set();
        set.add(pid);
        quoteToPallets.set(qid, set);
      }

      for (const q of oq ?? []) {
        const pallets = quoteToPallets.get(String(q.id));
        if (!pallets) continue;
        const usable = q.economically_usable === true;
        const incomplete =
          q.economically_usable !== true ||
          q.can_calculate !== true ||
          q.status === "INCOMPLETE";
        for (const pid of pallets) {
          const cur = outboundByPalletId.get(pid) ?? {
            incomplete: 0,
            usable: 0,
          };
          if (usable) cur.usable += 1;
          if (incomplete) cur.incomplete += 1;
          outboundByPalletId.set(pid, cur);
        }
      }
    }
  }

  const { data: selectedQuotes } = await sb
    .from("pallet_freight_quotes")
    .select(
      `
      id, pallet_id, total_cost_sek_cents, total_amount_minor, currency,
      economically_usable, selected,
      provider:logistics_providers(name),
      service:freight_services(name)
    `,
    )
    .in("pallet_id", palletIds)
    .eq("selected", true);

  for (const q of selectedQuotes ?? []) {
    const pid = String(q.pallet_id);
    const provider = q.provider as { name?: string } | null;
    const service = q.service as { name?: string } | null;
    selectedQuoteByPalletId.set(pid, {
      id: String(q.id),
      total_cost_sek_cents:
        q.total_cost_sek_cents != null ? Number(q.total_cost_sek_cents) : null,
      total_amount_minor:
        q.total_amount_minor != null ? Number(q.total_amount_minor) : null,
      currency: q.currency ? String(q.currency) : null,
      economically_usable: q.economically_usable === true,
      providerName: provider?.name ?? null,
      serviceName: service?.name ?? null,
    });
  }

  return {
    bottlesByPalletId,
    snapshotBottlesByPalletId,
    contributionByPalletId,
    selectedQuoteByPalletId,
    outboundByPalletId,
  };
}

function oreField(snapshot: Record<string, unknown>, key: string): number {
  const n = Number(snapshot[key]);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Roll up unit economics snapshots × quantity into pallet-level P/L lines.
 * Inbound pallet freight is NOT a line here — it is the shadow target.
 */
export function aggregateContributionEconomicsBreakdown(
  rows: Array<{
    quantity: number | null;
    economics_snapshot: unknown;
  }>,
): ContributionEconomicsBreakdown {
  const empty: ContributionEconomicsBreakdown = {
    bottlesWithSnapshot: 0,
    bottlesWithoutSnapshot: 0,
    productGrossRevenueCents: 0,
    productNetRevenueCents: 0,
    discountCents: 0,
    shippingRevenueGrossCents: 0,
    shippingRevenueNetCents: 0,
    purchaseCostCents: 0,
    exciseCents: 0,
    paymentFeeCents: 0,
    lastMileCostCents: 0,
    eprCents: 0,
    refundReserveCents: 0,
    prePalletContributionCents: 0,
    gm1Cents: 0,
    gm2Cents: 0,
    hasIncompleteUnitSnapshots: false,
  };

  for (const row of rows) {
    const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    if (qty <= 0) continue;
    const snap = row.economics_snapshot;
    if (!snap || typeof snap !== "object") {
      empty.bottlesWithoutSnapshot += qty;
      continue;
    }
    const s = snap as Record<string, unknown>;
    empty.bottlesWithSnapshot += qty;
    if (s.incomplete === true) empty.hasIncompleteUnitSnapshots = true;

    empty.productGrossRevenueCents += oreField(s, "unit_gross_revenue_cents") * qty;
    empty.productNetRevenueCents += oreField(s, "unit_net_revenue_cents") * qty;
    empty.discountCents += oreField(s, "unit_discount_cents") * qty;
    empty.shippingRevenueGrossCents +=
      oreField(s, "unit_shipping_revenue_gross_cents") * qty;
    empty.shippingRevenueNetCents +=
      oreField(s, "unit_shipping_revenue_net_cents") * qty;
    empty.purchaseCostCents += oreField(s, "unit_purchase_cost_cents") * qty;
    empty.exciseCents += oreField(s, "unit_excise_cents") * qty;
    empty.paymentFeeCents += oreField(s, "unit_payment_fee_cents") * qty;
    empty.lastMileCostCents += oreField(s, "unit_last_mile_cost_cents") * qty;
    empty.eprCents += oreField(s, "unit_epr_cents") * qty;
    empty.refundReserveCents += oreField(s, "unit_refund_reserve_cents") * qty;
    empty.prePalletContributionCents +=
      oreField(s, "unit_pre_pallet_contribution_cents") * qty;
  }

  const margins = deriveContributionMargins(empty);
  empty.gm1Cents = margins.gm1Cents;
  empty.gm2Cents = margins.gm2Cents;
  return empty;
}

export async function loadContributionEconomicsBreakdownForPallet(
  palletId: string,
): Promise<ContributionEconomicsBreakdown> {
  const sb = getSupabaseAdmin();
  const { data: reservations } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES]);
  const ids = (reservations ?? [])
    .map((r) => r.id as string)
    .filter(Boolean);
  if (ids.length === 0) {
    return aggregateContributionEconomicsBreakdown([]);
  }
  const { data: items } = await sb
    .from("order_reservation_items")
    .select("quantity, economics_snapshot")
    .in("reservation_id", ids);
  return aggregateContributionEconomicsBreakdown(items ?? []);
}

export function serializeOperatingSummary(input: {
  pallet: Record<string, unknown>;
  bottlesFilled: number;
  bottlesWithSnapshot: number;
  accumulatedContributionCents: number;
  selectedQuote: AggregateMaps["selectedQuoteByPalletId"] extends Map<
    string,
    infer V
  >
    ? V | undefined
    : never;
  outboundCounts: { incomplete: number; usable: number };
  packagingConfigured: boolean;
  packagingCode: string | null;
  rateValidTo: string | null;
  needsPalletZone?: boolean;
  pickupIsFallback?: boolean;
  economicsBreakdown?: ContributionEconomicsBreakdown | null;
}): AdminPalletOperatingSummary {
  const id = String(input.pallet.id);
  const physical = resolvePhysicalBottleCapacity(input.pallet.bottle_capacity);
  const minToShip = resolveMinBottlesToShip(
    input.pallet.min_bottles_to_complete,
  );
  const ship = computePalletShipProgress(
    input.bottlesFilled,
    minToShip,
    physical,
  );

  const selectedSek =
    input.selectedQuote?.economically_usable &&
    input.selectedQuote.total_cost_sek_cents != null &&
    input.selectedQuote.total_cost_sek_cents > 0
      ? input.selectedQuote.total_cost_sek_cents
      : null;

  const freightTargetSource = resolveFreightTargetSource({
    freight_target_cents: input.pallet.freight_target_cents as number | null,
    cost_cents: input.pallet.cost_cents as number | null,
    selectedQuoteSekCents: selectedSek,
  });

  const freightTargetCents = resolveFreightTargetCents({
    freight_target_cents: input.pallet.freight_target_cents as number | null,
    cost_cents: input.pallet.cost_cents as number | null,
    selected_inbound_freight_quote_total_sek_cents: selectedSek,
  });

  const econ = computePalletContributionProgress({
    bottlesFilled: input.bottlesFilled,
    bottlesWithSnapshot: input.bottlesWithSnapshot,
    accumulatedContributionCents: input.accumulatedContributionCents,
    freightTargetCents,
    minBottlesToShip: minToShip,
    physicalBottleCapacity: physical,
  });

  const inbound = {
    providerName: input.selectedQuote?.providerName ?? null,
    serviceName: input.selectedQuote?.serviceName ?? null,
    quoteId: input.selectedQuote?.id ?? null,
    currency: input.selectedQuote?.currency ?? null,
    totalOriginalMinor: input.selectedQuote?.total_amount_minor ?? null,
    totalSekCents: selectedSek,
    economicallyUsable: input.selectedQuote?.economically_usable === true,
  };

  const outbound = {
    providerName: "Instabee",
    serviceName: "Budbee Light Home Delivery – Sweden",
    packagingCode: input.packagingCode,
    packagingConfigured: input.packagingConfigured,
    incompleteQuoteCount: input.outboundCounts.incomplete,
    usableQuoteCount: input.outboundCounts.usable,
    rateValidTo: input.rateValidTo ?? null,
    volumetricFactorProvenance: "ASSUMPTION" as const,
    primaryIncompleteReason: input.packagingConfigured
      ? null
      : "MISSING_PACKAGING_DIMENSIONS",
  };

  const economics = {
    bottlesWithSnapshot: econ.bottlesWithSnapshot,
    accumulatedContributionCents: econ.accumulatedContributionCents,
    freightTargetCents: econ.freightTargetCents,
    freightTargetSource,
    freightFundedPercent: econ.freightFundedPercent,
    remainingContributionCents: econ.remainingContributionCents,
    expectedContributionPerBottleCents: econ.expectedContributionPerBottleCents,
    isEconomicallyReady: econ.isEconomicallyReady,
    hasIncompleteSnapshots: econ.hasIncompleteSnapshots,
    estimatedBottlesRemaining: econ.estimatedBottlesRemaining,
  };

  const warnings = buildWarnings({
    needsPalletZone: input.needsPalletZone,
    pickupIsFallback: input.pickupIsFallback,
    bottlesFilled: input.bottlesFilled,
    economics,
    inbound,
    outbound,
  });

  return {
    palletId: id,
    name: String(input.pallet.name ?? ""),
    bottlesFilled: ship.bottlesFilled,
    minBottlesToShip: ship.minBottlesToShip,
    bottlesRemainingToShip: ship.bottlesRemainingToShip,
    shipProgressPercent: ship.shipProgressPercent,
    isReadyToShip: ship.isReadyToShip,
    physicalBottleCapacity: physical,
    physicalBottlesRemaining: Math.max(0, physical - ship.bottlesFilled),
    physicalUtilizationPercent:
      physical > 0
        ? Math.round(Math.min(100, (ship.bottlesFilled / physical) * 100) * 10) /
          10
        : 0,
    operationalStatus:
      typeof input.pallet.status === "string" ? input.pallet.status : null,
    shippingOrderedAt:
      typeof input.pallet.shipping_ordered_at === "string"
        ? input.pallet.shipping_ordered_at
        : null,
    economics,
    economicsBreakdown: input.economicsBreakdown ?? null,
    inbound,
    outbound,
    warnings,
  };
}

/** Batch builder for admin list. */
export async function buildAdminPalletOperatingSummaries(
  pallets: Record<string, unknown>[],
): Promise<Map<string, AdminPalletOperatingSummary>> {
  const ids = pallets
    .map((p) => p.id)
    .filter((id): id is string => typeof id === "string");
  const maps = await loadAggregateMaps(ids);
  const packaging = await loadDefaultPackagingProfile();
  const catalogue = await loadActiveBudbeeLightSwedenRate();
  const packagingConfigured =
    packaging != null &&
    packaging.length_m != null &&
    packaging.width_m != null &&
    packaging.height_m != null &&
    Number(packaging.length_m) > 0 &&
    Number(packaging.width_m) > 0 &&
    Number(packaging.height_m) > 0;

  const out = new Map<string, AdminPalletOperatingSummary>();
  for (const pallet of pallets) {
    const id = String(pallet.id);
    out.set(
      id,
      serializeOperatingSummary({
        pallet,
        bottlesFilled: maps.bottlesByPalletId.get(id) ?? 0,
        bottlesWithSnapshot: maps.snapshotBottlesByPalletId.get(id) ?? 0,
        accumulatedContributionCents: maps.contributionByPalletId.get(id) ?? 0,
        selectedQuote: maps.selectedQuoteByPalletId.get(id),
        outboundCounts: maps.outboundByPalletId.get(id) ?? {
          incomplete: 0,
          usable: 0,
        },
        packagingConfigured,
        packagingCode: packaging?.code ?? null,
        rateValidTo: catalogue?.validTo ?? null,
        needsPalletZone: pallet.needs_pallet_zone === true,
        pickupIsFallback: pallet.pickup_is_fallback === true,
        economicsBreakdown: null,
      }),
    );
  }
  return out;
}

export async function buildAdminPalletOperatingSummaryForId(
  palletId: string,
): Promise<AdminPalletOperatingSummary | null> {
  const sb = getSupabaseAdmin();
  const { data: pallet, error } = await sb
    .from("pallets")
    .select(
      `
      *,
      delivery_zone:pallet_zones!delivery_zone_id(id, name),
      pickup_zone:pallet_zones!pickup_zone_id(id, name),
      shipping_region:shipping_regions(id, name),
      current_pickup_producer:producers!current_pickup_producer_id(id, name, is_pallet_zone)
    `,
    )
    .eq("id", palletId)
    .maybeSingle();
  if (error || !pallet) return null;

  const maps = await loadAggregateMaps([palletId]);
  const packaging = await loadDefaultPackagingProfile();
  const catalogue = await loadActiveBudbeeLightSwedenRate();
  const packagingConfigured =
    packaging != null &&
    packaging.length_m != null &&
    packaging.width_m != null &&
    packaging.height_m != null &&
    Number(packaging.length_m) > 0 &&
    Number(packaging.width_m) > 0 &&
    Number(packaging.height_m) > 0;

  const cpp = pallet.current_pickup_producer as
    | { id?: string; is_pallet_zone?: boolean | null }
    | null
    | undefined;
  const bottles = maps.bottlesByPalletId.get(palletId) ?? 0;
  const hasPickup =
    typeof pallet.current_pickup_producer_id === "string" &&
    pallet.current_pickup_producer_id.length > 0;
  const needsPalletZone = bottles > 0 && !hasPickup;
  const pickupIsFallback =
    cpp && typeof cpp.id === "string"
      ? cpp.is_pallet_zone !== true
      : false;

  const economicsBreakdown =
    await loadContributionEconomicsBreakdownForPallet(palletId);

  return serializeOperatingSummary({
    pallet: pallet as Record<string, unknown>,
    bottlesFilled: bottles,
    bottlesWithSnapshot: maps.snapshotBottlesByPalletId.get(palletId) ?? 0,
    accumulatedContributionCents:
      maps.contributionByPalletId.get(palletId) ?? 0,
    selectedQuote: maps.selectedQuoteByPalletId.get(palletId),
    outboundCounts: maps.outboundByPalletId.get(palletId) ?? {
      incomplete: 0,
      usable: 0,
    },
    packagingConfigured,
    packagingCode: packaging?.code ?? null,
    rateValidTo: catalogue?.validTo ?? null,
    needsPalletZone,
    pickupIsFallback,
    economicsBreakdown,
  });
}
