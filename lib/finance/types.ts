/**
 * Canonical management-finance types (öre / integer accounting).
 * Composes frozen PACT snapshots; Dirtywine via channel adapters.
 */

export type FinanceChannel = "pact" | "dirtywine" | "all";

export type FinanceMode = "actuals" | "scenario";

export type FinanceCompletenessStatus =
  | "complete"
  | "partial"
  | "missing"
  | "legacy";

export type FinanceWarningCode =
  | "missing_snapshot"
  | "incomplete_unit"
  | "missing_fx"
  | "missing_outbound"
  | "missing_shipping_revenue"
  | "shipping_zero_with_outbound"
  | "legacy_shipping_revenue_ambiguous"
  | "known_free_shipping"
  | "legacy_snapshot"
  | "missing_inbound_allocation"
  | "forecast_inbound_only"
  | "dirtywine_no_frozen_cogs"
  | "unknown_vat"
  | "instabee_incomplete";

export type FinanceWarning = {
  code: FinanceWarningCode;
  message: string;
};

/**
 * Aggregated finance breakdown. All money fields are integer öre (SEK cents).
 * Percentages are derived at presentation time from totals (never avg of %).
 */
export type FinanceBreakdown = {
  channel: FinanceChannel;
  mode: FinanceMode;

  bottles: number;
  orders: number;
  /** Bottles included in known margin math (complete enough for GM1 at least). */
  bottlesKnown: number;
  bottlesIncomplete: number;

  productGrossRevenueCents: number;
  productNetRevenueCents: number;
  shippingGrossRevenueCents: number;
  shippingNetRevenueCents: number;
  discountCents: number;

  producerPurchaseCostCents: number;
  alcoholExciseCents: number;

  gm1Cents: number;
  /** Primary continuity denominator: product net revenue. */
  gm1PercentOfProductNet: number | null;

  paymentFeesCents: number;
  outboundCarrierCostCents: number;
  eprCents: number;
  refundBreakageReserveCents: number;

  gm2Cents: number;
  gm2PercentOfProductNet: number | null;
  /** Optional secondary: GM2 / (product net + shipping net). */
  gm2PercentOfTotalNet: number | null;

  /** Allocated inbound freight for this rollup (0 if none / forecast-only not applied). */
  inboundFreightCents: number;
  inboundAllocationKind: "actual" | "forecast" | "none";

  gm3Cents: number;
  gm3PercentOfProductNet: number | null;

  opexAllocatedCents: number;
  operatingContributionCents: number;

  completeness: FinanceCompletenessStatus;
  coveragePercent: number | null;
  warnings: FinanceWarning[];
};

export type FinanceUnitScenarioInput = {
  /** Customer selling price major units (SEK). VAT treatment via priceIncludesVat. */
  sellingPriceMajor: number;
  priceIncludesVat: boolean;
  vatRate: number;
  bottles: number;
  bottlesPerOrder: number;

  purchaseCostCentsPerBottle: number;
  purchaseCostCurrency: string;
  purchaseFxRate: number | null;

  exciseCentsPerBottle: number;
  eprCentsPerBottle: number;
  refundBreakageReserveRate: number;

  /** Stripe % of (product gross + shipping gross). */
  stripeFeePercent: number;
  stripeFeeFixedCentsPerOrder: number;

  /** Customer shipping charged per order, gross öre (inkl moms if B2C). */
  shippingRevenueGrossCentsPerOrder: number;
  shippingPriceIncludesVat: boolean;

  /** Outbound carrier cost per order, öre. */
  outboundCarrierCostCentsPerOrder: number;

  /** Whole-pallet inbound freight, öre (scenario / selected quote). */
  inboundFreightTotalCents: number;
  /** Assumed ship quantity for inbound per-bottle allocation. */
  assumedShipQuantity: number;
};

export type FinanceUnitScenarioResult = {
  productGrossCentsPerBottle: number;
  productNetCentsPerBottle: number;
  shippingGrossCentsPerBottle: number;
  shippingNetCentsPerBottle: number;
  purchaseCostCentsPerBottle: number;
  exciseCentsPerBottle: number;
  paymentFeeCentsPerBottle: number;
  outboundCentsPerBottle: number;
  eprCentsPerBottle: number;
  refundReserveCentsPerBottle: number;
  inboundCentsPerBottle: number;

  gm1CentsPerBottle: number;
  gm2CentsPerBottle: number;
  gm3CentsPerBottle: number;

  gm1Percent: number | null;
  gm2Percent: number | null;
  gm3Percent: number | null;

  incomplete: boolean;
  incompleteReason: string | null;
};
