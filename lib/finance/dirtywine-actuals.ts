/**
 * Dirtywine / B2B invoice → FinanceBreakdown adapter.
 * No frozen economics_snapshot — mark COGS incomplete unless provided.
 */

import { grossToNetCents } from "@/lib/pallet-contribution";
import { buildFinanceBreakdown } from "@/lib/finance/margins";
import type { FinanceBreakdown, FinanceWarning } from "@/lib/finance/types";
import type { InvoiceData } from "@/types/invoice";
import { computeInvoiceGrandTotal } from "@/lib/invoice-total";

export type DirtywineOrderEconomicsInput = {
  orderId: string;
  invoice: InvoiceData | null;
  totalCents: number;
  /** Optional matched purchase cost (öre) when known from wines — else incomplete. */
  producerPurchaseCostCents?: number | null;
  alcoholExciseCents?: number | null;
};

/**
 * Dirtywine invoices are typically priced ex VAT (B2B).
 * product "gross" here = taxable merchandise before invoice VAT.
 * Shipping from shippingHandlingAmount (ex VAT, then taxed with invoice).
 */
export function aggregateDirtywineActuals(input: {
  orders: DirtywineOrderEconomicsInput[];
  opexAllocatedCents?: number;
}): FinanceBreakdown {
  const warnings: FinanceWarning[] = [];
  let bottles = 0;
  let productNet = 0;
  let productGross = 0;
  let shippingGross = 0;
  let shippingNet = 0;
  let discount = 0;
  let purchase = 0;
  let excise = 0;
  let bottlesKnown = 0;
  let bottlesIncomplete = 0;
  let hasCogs = false;

  for (const order of input.orders) {
    const inv = order.invoice;
    if (!inv || !Array.isArray(inv.items)) {
      warnings.push({
        code: "missing_snapshot",
        message: `Dirtywine-order ${order.orderId} saknar invoice_data`,
      });
      continue;
    }

    const taxRate = Number(inv.taxRate) || 0;
    const vatFraction = taxRate > 1 ? taxRate / 100 : taxRate;

    for (const item of inv.items) {
      const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      bottles += qty;
      const lineSub =
        qty * (Number(item.price) || 0) *
        (item.currency === inv.currency
          ? 1
          : Number(item.exchangeRate) || 1);
      let lineDisc = 0;
      if ((Number(item.discountValue) || 0) > 0) {
        lineDisc =
          item.discountType === "percentage"
            ? lineSub * ((Number(item.discountValue) || 0) / 100)
            : Math.min(Number(item.discountValue) || 0, lineSub);
      }
      const lineNetMajor = lineSub - lineDisc;
      const lineNetCents = Math.round(lineNetMajor * 100);
      productNet += lineNetCents;
      // B2B: listed price is ex VAT → "gross" display = net + VAT for customer-facing total awareness
      productGross += Math.round(lineNetCents * (1 + vatFraction));
      discount += Math.round(lineDisc * 100);
      bottlesIncomplete += qty; // until COGS attached
    }

    const shipMajor = Number(inv.shippingHandlingAmount) || 0;
    const shipNetCents = Math.round(shipMajor * 100);
    shippingNet += shipNetCents;
    shippingGross += Math.round(shipNetCents * (1 + vatFraction));

    if (
      order.producerPurchaseCostCents != null &&
      Number.isFinite(order.producerPurchaseCostCents)
    ) {
      purchase += Math.round(Number(order.producerPurchaseCostCents));
      hasCogs = true;
      // Move bottles to known if we have order-level COGS (approximate)
      bottlesKnown += inv.items.reduce(
        (s, i) => s + Math.max(0, Math.floor(Number(i.quantity) || 0)),
        0,
      );
      bottlesIncomplete = Math.max(0, bottles - bottlesKnown);
    }
    if (
      order.alcoholExciseCents != null &&
      Number.isFinite(order.alcoholExciseCents)
    ) {
      excise += Math.round(Number(order.alcoholExciseCents));
    }

    void computeInvoiceGrandTotal;
    void grossToNetCents;
  }

  if (!hasCogs && bottles > 0) {
    warnings.push({
      code: "dirtywine_no_frozen_cogs",
      message:
        "Dirtywine-fakturor saknar frysta inköps-/alkoholskatt-snapshots — COGS ofullständig",
    });
  }

  // Without COGS, report revenue but do not invent margins from zero purchase cost.
  const marginPurchase = hasCogs ? purchase : 0;
  const marginExcise = hasCogs ? excise : 0;

  const breakdown = buildFinanceBreakdown({
    channel: "dirtywine",
    mode: "actuals",
    bottles,
    orders: input.orders.length,
    bottlesKnown: hasCogs ? bottlesKnown : 0,
    bottlesIncomplete: hasCogs ? bottlesIncomplete : bottles,
    productGrossRevenueCents: productGross,
    productNetRevenueCents: productNet,
    shippingGrossRevenueCents: shippingGross,
    shippingNetRevenueCents: shippingNet,
    discountCents: discount,
    producerPurchaseCostCents: hasCogs ? marginPurchase : 0,
    alcoholExciseCents: hasCogs ? marginExcise : 0,
    paymentFeesCents: 0,
    outboundCarrierCostCents: 0,
    eprCents: 0,
    refundBreakageReserveCents: 0,
    inboundFreightCents: 0,
    inboundAllocationKind: "none",
    opexAllocatedCents: input.opexAllocatedCents ?? 0,
    completeness: hasCogs ? (warnings.length ? "partial" : "complete") : "partial",
    warnings,
  });

  // Without frozen/matched COGS, do not report product margin as if COGS were zero.
  if (!hasCogs) {
    return {
      ...breakdown,
      gm1Cents: 0,
      gm2Cents: 0,
      gm3Cents: 0,
      gm1PercentOfProductNet: null,
      gm2PercentOfProductNet: null,
      gm2PercentOfTotalNet: null,
      gm3PercentOfProductNet: null,
      operatingContributionCents: 0 - breakdown.opexAllocatedCents,
    };
  }

  return breakdown;
}
