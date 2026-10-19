/**
 * Editable fulfillment / GM2 unit-cost profile (Finance → Fulfillment costs).
 * Defaults mirror Finance scenario UI + contribution assumptions.
 */

import { getContributionAssumptions } from "@/lib/contribution-assumptions";

export const FINANCE_FULFILLMENT_COSTS_ID = "default";

export type FinanceFulfillmentCosts = {
  bottlesPerOrder: number;
  shippingRevenueGrossCentsPerOrder: number;
  shippingPriceIncludesVat: boolean;
  outboundCarrierCostCentsPerOrder: number;
  inboundFreightTotalCents: number;
  assumedShipQuantity: number;
  stripeFeePercent: number;
  stripeFeeFixedCentsPerOrder: number;
  eprCentsPerBottle: number;
  refundBreakageReserveRate: number;
  vatRate: number;
};

/** DB row shape (snake_case). */
export type FinanceFulfillmentCostsRow = {
  id: string;
  bottles_per_order: number;
  shipping_revenue_gross_cents_per_order: number;
  shipping_price_includes_vat: boolean;
  outbound_carrier_cost_cents_per_order: number;
  inbound_freight_total_cents: number;
  assumed_ship_quantity: number;
  stripe_fee_percent: number | string;
  stripe_fee_fixed_cents_per_order: number;
  epr_cents_per_bottle: number;
  refund_breakage_reserve_rate: number | string;
  vat_rate: number | string;
  updated_at?: string;
  updated_by?: string | null;
};

export function defaultFinanceFulfillmentCosts(): FinanceFulfillmentCosts {
  const a = getContributionAssumptions();
  return {
    bottlesPerOrder: 6,
    shippingRevenueGrossCentsPerOrder: 9900,
    shippingPriceIncludesVat: true,
    outboundCarrierCostCentsPerOrder: 6900,
    inboundFreightTotalCents: 0,
    assumedShipQuantity: 120,
    stripeFeePercent: a.stripeFeePercent,
    stripeFeeFixedCentsPerOrder: a.stripeFeeFixedCents,
    eprCentsPerBottle: a.eprCentsPerBottle,
    refundBreakageReserveRate: a.refundBreakageReserveRate,
    vatRate: a.vatRate,
  };
}

function asNonNegNumber(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function rowToFinanceFulfillmentCosts(
  row: Partial<FinanceFulfillmentCostsRow> | null | undefined,
): FinanceFulfillmentCosts {
  const d = defaultFinanceFulfillmentCosts();
  if (!row) return d;
  return {
    bottlesPerOrder: Math.max(
      1,
      Math.floor(asNonNegNumber(row.bottles_per_order, d.bottlesPerOrder)),
    ),
    shippingRevenueGrossCentsPerOrder: Math.round(
      asNonNegNumber(
        row.shipping_revenue_gross_cents_per_order,
        d.shippingRevenueGrossCentsPerOrder,
      ),
    ),
    shippingPriceIncludesVat: row.shipping_price_includes_vat !== false,
    outboundCarrierCostCentsPerOrder: Math.round(
      asNonNegNumber(
        row.outbound_carrier_cost_cents_per_order,
        d.outboundCarrierCostCentsPerOrder,
      ),
    ),
    inboundFreightTotalCents: Math.round(
      asNonNegNumber(
        row.inbound_freight_total_cents,
        d.inboundFreightTotalCents,
      ),
    ),
    assumedShipQuantity: Math.max(
      1,
      Math.floor(
        asNonNegNumber(row.assumed_ship_quantity, d.assumedShipQuantity),
      ),
    ),
    stripeFeePercent: asNonNegNumber(
      row.stripe_fee_percent,
      d.stripeFeePercent,
    ),
    stripeFeeFixedCentsPerOrder: Math.round(
      asNonNegNumber(
        row.stripe_fee_fixed_cents_per_order,
        d.stripeFeeFixedCentsPerOrder,
      ),
    ),
    eprCentsPerBottle: Math.round(
      asNonNegNumber(row.epr_cents_per_bottle, d.eprCentsPerBottle),
    ),
    refundBreakageReserveRate: asNonNegNumber(
      row.refund_breakage_reserve_rate,
      d.refundBreakageReserveRate,
    ),
    vatRate: Math.min(
      0.99,
      asNonNegNumber(row.vat_rate, d.vatRate),
    ),
  };
}

export function financeFulfillmentCostsToRow(
  costs: FinanceFulfillmentCosts,
): Omit<FinanceFulfillmentCostsRow, "id" | "updated_at" | "updated_by"> {
  const n = rowToFinanceFulfillmentCosts({
    bottles_per_order: costs.bottlesPerOrder,
    shipping_revenue_gross_cents_per_order:
      costs.shippingRevenueGrossCentsPerOrder,
    shipping_price_includes_vat: costs.shippingPriceIncludesVat,
    outbound_carrier_cost_cents_per_order:
      costs.outboundCarrierCostCentsPerOrder,
    inbound_freight_total_cents: costs.inboundFreightTotalCents,
    assumed_ship_quantity: costs.assumedShipQuantity,
    stripe_fee_percent: costs.stripeFeePercent,
    stripe_fee_fixed_cents_per_order: costs.stripeFeeFixedCentsPerOrder,
    epr_cents_per_bottle: costs.eprCentsPerBottle,
    refund_breakage_reserve_rate: costs.refundBreakageReserveRate,
    vat_rate: costs.vatRate,
  });
  return {
    bottles_per_order: n.bottlesPerOrder,
    shipping_revenue_gross_cents_per_order: n.shippingRevenueGrossCentsPerOrder,
    shipping_price_includes_vat: n.shippingPriceIncludesVat,
    outbound_carrier_cost_cents_per_order: n.outboundCarrierCostCentsPerOrder,
    inbound_freight_total_cents: n.inboundFreightTotalCents,
    assumed_ship_quantity: n.assumedShipQuantity,
    stripe_fee_percent: n.stripeFeePercent,
    stripe_fee_fixed_cents_per_order: n.stripeFeeFixedCentsPerOrder,
    epr_cents_per_bottle: n.eprCentsPerBottle,
    refund_breakage_reserve_rate: n.refundBreakageReserveRate,
    vat_rate: n.vatRate,
  };
}

/** Parse API / form body (camelCase or snake_case) into a normalized profile. */
export function parseFinanceFulfillmentCostsBody(
  body: unknown,
): FinanceFulfillmentCosts {
  const d = defaultFinanceFulfillmentCosts();
  if (!body || typeof body !== "object") return d;
  const b = body as Record<string, unknown>;
  return rowToFinanceFulfillmentCosts({
    bottles_per_order: (b.bottlesPerOrder ?? b.bottles_per_order) as number,
    shipping_revenue_gross_cents_per_order: (b.shippingRevenueGrossCentsPerOrder ??
      b.shipping_revenue_gross_cents_per_order) as number,
    shipping_price_includes_vat: (b.shippingPriceIncludesVat ??
      b.shipping_price_includes_vat) as boolean,
    outbound_carrier_cost_cents_per_order: (b.outboundCarrierCostCentsPerOrder ??
      b.outbound_carrier_cost_cents_per_order) as number,
    inbound_freight_total_cents: (b.inboundFreightTotalCents ??
      b.inbound_freight_total_cents) as number,
    assumed_ship_quantity: (b.assumedShipQuantity ??
      b.assumed_ship_quantity) as number,
    stripe_fee_percent: (b.stripeFeePercent ?? b.stripe_fee_percent) as number,
    stripe_fee_fixed_cents_per_order: (b.stripeFeeFixedCentsPerOrder ??
      b.stripe_fee_fixed_cents_per_order) as number,
    epr_cents_per_bottle: (b.eprCentsPerBottle ??
      b.epr_cents_per_bottle) as number,
    refund_breakage_reserve_rate: (b.refundBreakageReserveRate ??
      b.refund_breakage_reserve_rate) as number,
    vat_rate: (b.vatRate ?? b.vat_rate) as number,
  });
}
