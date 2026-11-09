import {
  displayFractionDigits,
  roundAmountForDisplay,
} from "@/lib/shopping-context/format";
import { resolveWineAlcoholTaxCents } from "@/lib/wine-alcohol-tax";

export interface WinePricingData {
  cost_amount: number;
  exchange_rate: number;
  alcohol_tax_cents: number;
  margin_percentage: number;
  base_price_cents: number;
}

/** SEK list price in öre for breakdown; prefer stored value over display-currency amount. */
export function getProductBasePriceCents(product: {
  priceBreakdown?: { basePriceCents?: number };
  priceRange?: { minVariantPrice?: { amount: string | number } };
}): number {
  const fromBreakdown = product.priceBreakdown?.basePriceCents;
  if (fromBreakdown != null && fromBreakdown > 0) {
    return fromBreakdown;
  }
  return Math.round(Number(product.priceRange?.minVariantPrice?.amount ?? 0) * 100);
}

/** SEK list price in whole units for display; null when only a foreign-currency amount exists. */
export function getProductListPriceSek(product: {
  priceBreakdown?: { basePriceCents?: number };
  priceRange?: { minVariantPrice?: { amount: string | number } };
}): number | null {
  const cents = getProductBasePriceCents(product);
  if (!(cents > 0)) return null;
  // Same half-up whole-kronor binding as PLP/PDP/cart/Stripe (CFO).
  // Inline Math.round so this module does not import cart helpers.
  return Math.round(cents / 100);
}

/** B2B price exkl moms: (costInSek + shippingPerBottleSek) / (1 - b2b_margin/100) */
export function calculateB2BPriceExclVat(
  costAmount: number,
  exchangeRate: number,
  alcoholTaxCents: number,
  b2bMarginPercentage: number,
  shippingPerBottleSek: number = 0,
): number {
  const resolvedAlcoholTaxCents = resolveWineAlcoholTaxCents(alcoholTaxCents);
  const costInSek =
    costAmount * exchangeRate +
    resolvedAlcoholTaxCents / 100 +
    shippingPerBottleSek;
  return costInSek / (1 - b2bMarginPercentage / 100);
}

/**
 * Whole SEK for Dirty Wine / admin B2B display.
 * Matches admin wine-form (`Math.round`) so PLP does not ceil 147.2 → 148.
 */
export function roundB2BPriceExclVatSek(priceExclVat: number): number {
  if (!Number.isFinite(priceExclVat) || priceExclVat <= 0) return 0;
  return Math.round(priceExclVat);
}

/** Live B2B unit price exkl. moms, rounded the same way as admin + shop cards. */
export function calculateRoundedB2BPriceExclVat(
  costAmount: number,
  exchangeRate: number,
  alcoholTaxCents: number,
  b2bMarginPercentage: number,
  shippingPerBottleSek: number = 0,
): number {
  return roundB2BPriceExclVatSek(
    calculateB2BPriceExclVat(
      costAmount,
      exchangeRate,
      alcoholTaxCents,
      b2bMarginPercentage,
      shippingPerBottleSek,
    ),
  );
}

/**
 * Calculate B2B price with member discount applied to margin only
 * @param b2bPriceExclVat - B2B price exkl VAT without discount
 * @param b2bMarginPercentage - B2B margin percentage (0-100)
 * @param memberDiscountPercent - Member discount percentage (0-100)
 * @returns B2B price exkl VAT with discount applied to margin
 */
export function calculateB2BPriceWithDiscount(
  b2bPriceExclVat: number,
  b2bMarginPercentage: number,
  memberDiscountPercent: number = 0,
): number {
  if (memberDiscountPercent <= 0) {
    return b2bPriceExclVat;
  }

  // Extract cost + alcohol tax from B2B price
  // b2bPriceExclVat = (cost + alcoholTax) / (1 - b2bMarginPercentage/100)
  // So: cost + alcoholTax = b2bPriceExclVat * (1 - b2bMarginPercentage/100)
  const costPlusTax = b2bPriceExclVat * (1 - b2bMarginPercentage / 100);

  // Calculate original margin amount
  const originalMargin = b2bPriceExclVat - costPlusTax;

  // Apply discount to margin
  const discountedMargin = originalMargin * (1 - memberDiscountPercent / 100);

  // New price = cost + tax + discounted margin
  // Round up to 2 decimal places to match currency formatting
  const newPrice = costPlusTax + discountedMargin;
  return Math.ceil(newPrice * 100) / 100;
}

export interface PriceBreakdownResult {
  cost: number;
  alcoholTax: number;
  shipping?: number;
  margin: number;
  vat: number;
  total: number;
  marginPercentage: number;
  originalMarginPercentage: number;
  /** B2C: SEK saved vs list price (member discount on gross, same as shop cards). */
  memberDiscountAmount?: number;
  /** B2C list price inkl. moms before member discount (for reference). */
  listTotalInclVat?: number;
}

/**
 * Calculate detailed price breakdown for B2B price (exkl. moms)
 * @param b2bPriceExclVat - B2B price exkl. moms (with discount if applicable)
 * @param costAmount - Cost amount in original currency
 * @param exchangeRate - Exchange rate to SEK
 * @param alcoholTaxCents - Alcohol tax in cents
 * @param b2bMarginPercentage - B2B margin percentage (0-100)
 * @param memberDiscountPercent - Member discount percentage (0-100)
 * @param shippingPerBottleSek - Shipping per bottle in SEK (optional)
 * @returns Detailed price breakdown in SEK
 */
export function calculateB2BPriceBreakdown(
  b2bPriceExclVat: number,
  costAmount: number,
  exchangeRate: number,
  alcoholTaxCents: number,
  b2bMarginPercentage: number,
  memberDiscountPercent: number = 0,
  shippingPerBottleSek: number = 0,
): PriceBreakdownResult {
  const resolvedAlcoholTaxCents = resolveWineAlcoholTaxCents(alcoholTaxCents);
  // Convert alcohol tax from öre to SEK and round up
  const alcoholTax = Math.ceil((resolvedAlcoholTaxCents / 100) * 100) / 100;

  // Calculate cost in SEK and round up
  const costInSek = Math.ceil((costAmount * exchangeRate) * 100) / 100;

  // Store original margin percentage
  const originalMarginPercentage = b2bMarginPercentage;

  // Apply member discount to margin percentage
  const marginPercent = b2bMarginPercentage * (1 - memberDiscountPercent / 100);

  // Calculate margin amount and round up
  // For B2B: b2bPriceExclVat = cost + alcoholTax + shipping + margin
  // So: margin = b2bPriceExclVat - cost - alcoholTax - shipping
  const margin =
    Math.ceil(
      (b2bPriceExclVat - costInSek - alcoholTax - shippingPerBottleSek) * 100,
    ) / 100;

  // For B2B, there's no VAT (price is exkl. moms)
  const vat = 0;

  // Canonical shop/admin total (whole SEK). Component ceils can sum to 147.01;
  // that must not leak into the displayed total (ceil → 148).
  const expectedTotal = roundB2BPriceExclVatSek(b2bPriceExclVat);
  const componentsSum =
    Math.round(
      (costInSek + alcoholTax + shippingPerBottleSek + margin) * 100,
    ) / 100;
  const diff = expectedTotal - componentsSum;
  const cost =
    Math.abs(diff) >= 0.005
      ? Math.round((costInSek + diff) * 100) / 100
      : costInSek;

  return {
    cost,
    alcoholTax,
    shipping: shippingPerBottleSek > 0 ? shippingPerBottleSek : undefined,
    margin,
    vat,
    total: expectedTotal,
    marginPercentage: marginPercent,
    originalMarginPercentage,
  };
}

/**
 * Decompose B2C retail price inkl. moms into cost, alcohol tax, margin, VAT.
 *
 * CFO binding: `totalInclVat` is already the whole-kronor list unit (half-up from
 * öre). Components are derived in integer öre so they always sum exactly to
 * that total — never reconstruct a float total and ceil it (that produced
 * 294.01 → 295 / 310.01 → 311 after hydration).
 */
function decomposeRetailPriceInclVat(
  totalInclVat: number,
  wine: Pick<
    WinePricingData,
    "cost_amount" | "exchange_rate" | "alcohol_tax_cents" | "margin_percentage"
  >,
): Pick<
  PriceBreakdownResult,
  "cost" | "alcoholTax" | "margin" | "vat" | "total"
> {
  const totalSek = Math.round(totalInclVat);
  // Binding total in öre (whole kronor × 100).
  const totalOre = totalSek * 100;
  // 25% VAT: excl = total × 4/5 in integer öre; VAT is the remainder.
  const netOre = Math.round((totalOre * 4) / 5);
  const vatOre = totalOre - netOre;

  const alcoholTaxOre = resolveWineAlcoholTaxCents(wine.alcohol_tax_cents);

  const bottleCostRaw = (wine.cost_amount || 0) * (wine.exchange_rate || 0);
  const useImportCost =
    wine.cost_amount > 0 &&
    wine.exchange_rate > 0 &&
    Number.isFinite(bottleCostRaw) &&
    bottleCostRaw > 0;

  let costOre: number;
  if (useImportCost) {
    costOre = Math.round(bottleCostRaw * 100);
  } else {
    const marginPercent = wine.margin_percentage || 0;
    // Reverse cost from net excl. VAT with margin: net = cost×(1+m/100) + tax
    // → cost = (net - tax) / (1 + m/100)
    const denom = 1 + marginPercent / 100;
    costOre =
      denom > 0
        ? Math.round(((netOre - alcoholTaxOre) / 100 / denom) * 100)
        : 0;
  }

  // Margin absorbs any remainder so cost + tax + margin + vat === total exactly.
  const marginOre = netOre - costOre - alcoholTaxOre;

  return {
    cost: costOre / 100,
    alcoholTax: alcoholTaxOre / 100,
    margin: marginOre / 100,
    vat: vatOre / 100,
    total: totalSek,
  };
}

/**
 * Member discount on B2C list price — matches {@link MemberPrice} / shop cards.
 * CFO: unit after discount → nearest whole krona, half up (Math.round).
 */
export function memberDiscountedTotalInclVat(
  listPriceInclVat: number,
  memberDiscountPercent: number,
): number {
  if (memberDiscountPercent <= 0) return listPriceInclVat;
  const raw = listPriceInclVat * (1 - memberDiscountPercent / 100);
  return Math.round(Number.parseFloat(raw.toFixed(2)));
}

/**
 * Calculate detailed price breakdown for a wine by working backwards from final price
 * @param wine - Wine pricing data from database
 * @param memberDiscountPercent - Member discount percentage (0-100), applied to gross like shop
 * @returns Detailed price breakdown in SEK
 */
export function calculatePriceBreakdown(
  wine: WinePricingData,
  memberDiscountPercent: number = 0,
): PriceBreakdownResult {
  // Binding list unit: half-up whole kronor from stored öre (never ceil).
  const listTotalInclVat = Math.round(wine.base_price_cents / 100);
  const originalMarginPercentage = wine.margin_percentage;

  const base = decomposeRetailPriceInclVat(listTotalInclVat, wine);
  // Guard: components must sum to the integer total (no float drift).
  const partsSumOre = Math.round(
    (base.cost + base.alcoholTax + base.margin + base.vat) * 100,
  );
  if (partsSumOre !== listTotalInclVat * 100) {
    base.margin =
      (listTotalInclVat * 100 -
        Math.round(base.cost * 100) -
        Math.round(base.alcoholTax * 100) -
        Math.round(base.vat * 100)) /
      100;
    base.total = listTotalInclVat;
  }

  if (memberDiscountPercent <= 0) {
    return {
      ...base,
      total: listTotalInclVat,
      marginPercentage: originalMarginPercentage,
      originalMarginPercentage,
      listTotalInclVat,
    };
  }

  const discountedTotal = memberDiscountedTotalInclVat(
    listTotalInclVat,
    memberDiscountPercent,
  );
  const memberDiscountAmount = listTotalInclVat - discountedTotal;

  return {
    cost: base.cost,
    alcoholTax: base.alcoholTax,
    margin: base.margin,
    vat: base.vat,
    // Display/charge total is the integer discounted unit — never a float rebuild.
    total: discountedTotal,
    marginPercentage: originalMarginPercentage,
    originalMarginPercentage,
    memberDiscountAmount,
    listTotalInclVat,
  };
}

export type FormatCurrencyOptions = {
  currencyCode?: string;
  intlLocale?: string;
};

/**
 * Format currency amount for display
 * @param amount - Amount in major units (e.g. SEK)
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  const currencyCode = options.currencyCode ?? "SEK";
  const intlLocale = options.intlLocale ?? "sv-SE";
  const decimals = displayFractionDigits(currencyCode);
  const mode =
    currencyCode.trim().toUpperCase() === "SEK" ? "round" : "ceil";
  const roundedAmount = roundAmountForDisplay(amount, currencyCode, mode);
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundedAmount);
}

/** Format for price breakdown (2 decimals, rounded) */
export function formatCurrencyBreakdown(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  const currencyCode = options.currencyCode ?? "SEK";
  const intlLocale = options.intlLocale ?? "sv-SE";
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/** Total price without decimals */
export function formatCurrencyWhole(
  amount: number,
  options: FormatCurrencyOptions = {},
): string {
  const currencyCode = options.currencyCode ?? "SEK";
  const intlLocale = options.intlLocale ?? "sv-SE";
  const rounded = Math.round(amount);
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

/**
 * Calculate percentage of total for each component
 * @param breakdown - Price breakdown result
 * @returns Percentages for each component
 */
export function calculatePercentages(breakdown: PriceBreakdownResult) {
  const total = breakdown.total;

  return {
    cost: (breakdown.cost / total) * 100,
    alcoholTax: (breakdown.alcoholTax / total) * 100,
    shipping: breakdown.shipping ? (breakdown.shipping / total) * 100 : 0,
    margin: (breakdown.margin / total) * 100,
    vat: (breakdown.vat / total) * 100,
    memberDiscount: breakdown.memberDiscountAmount
      ? (breakdown.memberDiscountAmount / total) * 100
      : 0,
  };
}

/**
 * Stacked bar segments for B2C with member discount: shares of **list** price (sum 100%).
 * The displayed total next to the bar is still the discounted total.
 */
export function calculateListCompositionPercentages(breakdown: PriceBreakdownResult) {
  const p = breakdown.listTotalInclVat ?? breakdown.total;
  if (p <= 0) {
    return { cost: 0, alcoholTax: 0, margin: 0, vat: 0, memberDiscount: 0 };
  }
  return {
    cost: (breakdown.cost / p) * 100,
    alcoholTax: (breakdown.alcoholTax / p) * 100,
    margin: (breakdown.margin / p) * 100,
    vat: (breakdown.vat / p) * 100,
    memberDiscount: breakdown.memberDiscountAmount
      ? (breakdown.memberDiscountAmount / p) * 100
      : 0,
  };
}

/**
 * Synchronous version — same as {@link calculatePriceBreakdown}.
 */
export function calculatePriceBreakdownSync(
  wine: WinePricingData,
  memberDiscountPercent: number = 0,
): PriceBreakdownResult {
  return calculatePriceBreakdown(wine, memberDiscountPercent);
}
