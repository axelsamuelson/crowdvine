/**
 * Build frozen economics snapshots for order_reservation_items at checkout confirm.
 *
 * Lifecycle: snapshot when reservation items are inserted — the same moment
 * bottles enter PALLET_FILL_STATUSES (pending_producer_approval / conditional_pending).
 * Earlier would allow price/COGS drift; later would lag the bottle fill meter.
 *
 * Outbound carrier cost (Phase 2C): prefer allocated outbound_freight_quotes total.
 * Never invent zero outbound cost when the engine was expected but incomplete.
 */

import {
  getContributionAssumptions,
  type ContributionAssumptions,
} from "@/lib/contribution-assumptions";
import {
  buildUnitEconomicsSnapshot,
  linePrePalletContributionCents,
  type UnitEconomicsSnapshot,
} from "@/lib/pallet-contribution";
import { getWineAlcoholTaxCentsPerBottle } from "@/lib/b2b-wine-cost";
import { resolvePurchaseCostCentsForContribution } from "@/lib/exchange-rate-strict";
import type { WineCostFields } from "@/lib/b2b-wine-cost";

export type CartLineEconomicsSource = {
  merchandiseId: string;
  quantity: number;
  /** Line merchandise total in major SEK after cart-level price rules (member/early-bird). */
  lineTotalSek: number;
};

export type WineEconomicsFields = WineCostFields & {
  price_includes_vat?: boolean | null;
};

export type ReservationItemEconomicsRow = {
  reservation_id: string;
  item_id: string;
  quantity: number;
  price_band: "market";
  economics_snapshot: UnitEconomicsSnapshot;
  /** Null when snapshot incomplete (e.g. missing FX / outbound) — excluded from economic meter. */
  pre_pallet_contribution_cents: number | null;
  outbound_freight_quote_id?: string | null;
};

/**
 * Allocate an integer pool across weights (largest remainder).
 */
export function allocatePoolByWeights(
  pool: number,
  weights: number[],
): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (pool === 0 || totalWeight <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (Math.max(0, w) / totalWeight) * pool);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = Math.round(pool) - floors.reduce((s, x) => s + x, 0);
  const fracOrder = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floors];
  let idx = 0;
  while (remainder > 0 && idx < fracOrder.length) {
    out[fracOrder[idx]!.i]! += 1;
    remainder -= 1;
    idx += 1;
  }
  while (remainder < 0 && idx < fracOrder.length) {
    const i = fracOrder[idx]!.i;
    if (out[i]! > 0) {
      out[i]! -= 1;
      remainder += 1;
    }
    idx += 1;
  }
  return out;
}

/**
 * Stripe % fee base = paid product gross + allocated customer shipping gross.
 * Fixed fee is allocated once per checkout via paymentFeeFixedCents (caller must
 * split the single checkout fixed fee across reservations by bottle weight).
 */
export function stripePercentFeeCents(
  productGrossCents: number,
  shippingGrossCents: number,
  stripeFeePercent: number,
): number {
  const base =
    Math.max(0, Math.round(productGrossCents)) +
    Math.max(0, Math.round(shippingGrossCents));
  return Math.round(base * stripeFeePercent);
}

export type OutboundEconomicsInput =
  | {
      mode: "quote";
      /** Total outbound carrier cost for this reservation's share, öre. */
      allocatedOutboundCostCents: number;
      quoteId: string;
      providerCode?: string | null;
      serviceName?: string | null;
    }
  | {
      mode: "incomplete";
      reason: string;
      quoteId?: string | null;
    }
  | {
      /** Legacy only — avoid for new SE Instabee checkouts. */
      mode: "legacy_last_mile";
      lastMileCostCentsPerBottle: number;
    };

export function buildReservationItemEconomicsRows(input: {
  reservationId: string;
  lines: CartLineEconomicsSource[];
  wineById: Map<string, WineEconomicsFields>;
  /** Order-level discounts (promo + voucher + pact) for this reservation, öre. */
  orderLevelDiscountCents: number;
  /** Customer shipping charged allocated to this reservation, öre inkl moms. */
  shippingRevenueGrossCents: number;
  /** Outbound carrier economics (separate from customer shipping revenue). */
  outbound: OutboundEconomicsInput;
  /** Share of checkout Stripe fixed fee allocated to this reservation, öre. */
  paymentFeeFixedCents: number;
  /** Live/stored FX map for non-SEK wines (currency → SEK). */
  rateMap?: Record<string, number>;
  assumptions?: ContributionAssumptions;
}): ReservationItemEconomicsRow[] {
  const assumptions = input.assumptions ?? getContributionAssumptions();
  const lines = input.lines.filter((l) => (Number(l.quantity) || 0) > 0);
  if (lines.length === 0) return [];

  const lineGrossCents = lines.map((l) =>
    Math.max(0, Math.round((Number(l.lineTotalSek) || 0) * 100)),
  );
  const quantities = lines.map((l) => Math.max(0, Math.floor(l.quantity)));
  const totalBottles = quantities.reduce((s, q) => s + q, 0);
  if (totalBottles <= 0) return [];

  const discountAlloc = allocatePoolByWeights(
    Math.max(0, Math.round(input.orderLevelDiscountCents)),
    lineGrossCents,
  );
  const shippingAlloc = allocatePoolByWeights(
    Math.max(0, Math.round(input.shippingRevenueGrossCents)),
    quantities,
  );
  const fixedFeeAlloc = allocatePoolByWeights(
    Math.max(0, Math.round(input.paymentFeeFixedCents)),
    quantities,
  );

  let outboundLineAlloc: number[] = quantities.map(() => 0);
  let outboundIncomplete = false;
  let outboundIncompleteReason: string | null = null;
  let outboundQuoteId: string | null = null;
  let outboundSource: UnitEconomicsSnapshot["outbound_cost_source"] = null;
  let outboundProvider: string | null = null;
  let outboundService: string | null = null;

  if (input.outbound.mode === "incomplete") {
    outboundIncomplete = true;
    outboundIncompleteReason = input.outbound.reason;
    outboundQuoteId = input.outbound.quoteId ?? null;
    outboundSource = "incomplete";
  } else if (input.outbound.mode === "quote") {
    outboundLineAlloc = allocatePoolByWeights(
      Math.max(0, Math.round(input.outbound.allocatedOutboundCostCents)),
      quantities,
    );
    outboundQuoteId = input.outbound.quoteId;
    outboundSource = "outbound_quote";
    outboundProvider = input.outbound.providerCode ?? null;
    outboundService = input.outbound.serviceName ?? null;
  } else {
    outboundSource = "legacy_last_mile";
  }

  return lines.map((line, i) => {
    const qty = quantities[i]!;
    const grossLine = lineGrossCents[i]!;
    const discountLine = discountAlloc[i] ?? 0;
    const paidLine = Math.max(0, grossLine - discountLine);
    const unitGross = Math.round(paidLine / qty);
    const unitDiscount = Math.round(discountLine / qty);
    const unitShipGross = Math.round((shippingAlloc[i] ?? 0) / qty);
    const unitFixedFee = Math.round((fixedFeeAlloc[i] ?? 0) / qty);
    const unitPercentFee = stripePercentFeeCents(
      unitGross,
      unitShipGross,
      assumptions.stripeFeePercent,
    );
    const unitPaymentFee = unitPercentFee + unitFixedFee;

    const unitOutbound =
      input.outbound.mode === "legacy_last_mile"
        ? Math.max(0, Math.round(input.outbound.lastMileCostCentsPerBottle))
        : Math.round((outboundLineAlloc[i] ?? 0) / qty);

    const wine = input.wineById.get(line.merchandiseId) ?? {};
    const priceIncludesVat = wine.price_includes_vat !== false;
    const purchase = resolvePurchaseCostCentsForContribution(
      wine,
      input.rateMap,
    );
    const unitExcise = getWineAlcoholTaxCentsPerBottle(wine);

    const markIncomplete = (
      snapshot: UnitEconomicsSnapshot,
      reason: string,
    ): ReservationItemEconomicsRow => {
      snapshot.incomplete = true;
      snapshot.incomplete_reason = reason;
      snapshot.unit_pre_pallet_contribution_cents = 0;
      snapshot.outbound_quote_id = outboundQuoteId;
      snapshot.outbound_cost_source = outboundSource;
      snapshot.outbound_provider_code = outboundProvider;
      snapshot.outbound_service_name = outboundService;
      snapshot.outbound_allocation_method =
        outboundSource === "outbound_quote" ? "by_bottle_quantity" : null;
      return {
        reservation_id: input.reservationId,
        item_id: line.merchandiseId,
        quantity: qty,
        price_band: "market" as const,
        economics_snapshot: snapshot,
        pre_pallet_contribution_cents: null,
        outbound_freight_quote_id: outboundQuoteId,
      };
    };

    if (outboundIncomplete) {
      const snap = buildUnitEconomicsSnapshot({
        unitGrossRevenueCents: unitGross,
        unitDiscountCents: unitDiscount,
        unitPurchaseCostCents: purchase.ok ? purchase.cents : 0,
        unitExciseCents: unitExcise,
        unitShippingRevenueGrossCents: unitShipGross,
        unitLastMileCostCents: 0,
        unitPaymentFeeCents: unitPaymentFee,
        priceIncludesVat,
        assumptions,
      });
      return markIncomplete(
        snap,
        outboundIncompleteReason || "Outbound freight incomplete",
      );
    }

    if (!purchase.ok) {
      const incompleteSnapshot = buildUnitEconomicsSnapshot({
        unitGrossRevenueCents: unitGross,
        unitDiscountCents: unitDiscount,
        unitPurchaseCostCents: 0,
        unitExciseCents: unitExcise,
        unitShippingRevenueGrossCents: unitShipGross,
        unitLastMileCostCents: unitOutbound,
        unitPaymentFeeCents: unitPaymentFee,
        priceIncludesVat,
        assumptions,
      });
      incompleteSnapshot.purchase_cost_currency = purchase.currency;
      incompleteSnapshot.purchase_fx_rate = null;
      return markIncomplete(incompleteSnapshot, purchase.reason);
    }

    const snapshot = buildUnitEconomicsSnapshot({
      unitGrossRevenueCents: unitGross,
      unitDiscountCents: unitDiscount,
      unitPurchaseCostCents: purchase.cents,
      unitExciseCents: unitExcise,
      unitShippingRevenueGrossCents: unitShipGross,
      unitLastMileCostCents: unitOutbound,
      unitPaymentFeeCents: unitPaymentFee,
      priceIncludesVat,
      assumptions,
    });
    snapshot.purchase_fx_rate = purchase.fxRate;
    snapshot.purchase_cost_currency = purchase.currency;
    snapshot.outbound_quote_id = outboundQuoteId;
    snapshot.outbound_cost_source = outboundSource;
    snapshot.outbound_provider_code = outboundProvider;
    snapshot.outbound_service_name = outboundService;
    snapshot.outbound_allocation_method =
      outboundSource === "outbound_quote" ? "by_bottle_quantity" : null;

    return {
      reservation_id: input.reservationId,
      item_id: line.merchandiseId,
      quantity: qty,
      price_band: "market" as const,
      economics_snapshot: snapshot,
      pre_pallet_contribution_cents: linePrePalletContributionCents(
        snapshot,
        qty,
      ),
      outbound_freight_quote_id: outboundQuoteId,
    };
  });
}
