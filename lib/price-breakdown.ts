export interface WinePricingData {
  cost_amount: number;
  exchange_rate: number;
  alcohol_tax_cents: number;
  margin_percentage: number;
  base_price_cents: number;
}

/** B2B price exkl moms: (costInSek + shippingPerBottleSek) / (1 - b2b_margin/100) */
export function calculateB2BPriceExclVat(
  costAmount: number,
  exchangeRate: number,
  alcoholTaxCents: number,
  b2bMarginPercentage: number,
  shippingPerBottleSek: number = 0,
): number {
  const costInSek =
    costAmount * exchangeRate +
    alcoholTaxCents / 100 +
    shippingPerBottleSek;
  return costInSek / (1 - b2bMarginPercentage / 100);
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
  // Convert alcohol tax from öre to SEK and round up
  const alcoholTax = Math.ceil((alcoholTaxCents / 100) * 100) / 100;
  
  // Calculate cost in SEK and round up
  const costInSek = Math.ceil((costAmount * exchangeRate) * 100) / 100;
  
  // Store original margin percentage
  const originalMarginPercentage = b2bMarginPercentage;
  
  // Apply member discount to margin percentage
  const marginPercent = b2bMarginPercentage * (1 - memberDiscountPercent / 100);
  
  // Calculate margin amount and round up
  // For B2B: b2bPriceExclVat = cost + alcoholTax + shipping + margin
  // So: margin = b2bPriceExclVat - cost - alcoholTax - shipping
  const margin = Math.ceil((b2bPriceExclVat - costInSek - alcoholTax - shippingPerBottleSek) * 100) / 100;
  
  // For B2B, there's no VAT (price is exkl. moms)
  const vat = 0;
  
  // Calculate total as sum of components to ensure consistency
  // Round up to 2 decimal places to match currency formatting
  let total = Math.ceil((costInSek + alcoholTax + shippingPerBottleSek + margin) * 100) / 100;
  
  // If there's a difference between calculated total and expected b2bPriceExclVat,
  // add the difference to bottle cost to ensure they match exactly
  const expectedTotal = Math.ceil(b2bPriceExclVat * 100) / 100;
  const diff = expectedTotal - total;
  if (Math.abs(diff) >= 0.01) {
    // Add difference to cost (round up to ensure we don't lose precision)
    const adjustedCost = Math.ceil((costInSek + diff) * 100) / 100;
    // Recalculate total with adjusted cost - this should now match expectedTotal exactly
    total = Math.ceil((adjustedCost + alcoholTax + shippingPerBottleSek + margin) * 100) / 100;
    // Final check: if there's still a tiny difference due to rounding, adjust cost one more time
    const finalDiff = expectedTotal - total;
    if (Math.abs(finalDiff) >= 0.01) {
      const finalCost = Math.ceil((adjustedCost + finalDiff) * 100) / 100;
      total = expectedTotal; // Set total directly to expected to ensure exact match
      return {
        cost: finalCost,
        alcoholTax,
        shipping: shippingPerBottleSek > 0 ? shippingPerBottleSek : undefined,
        margin,
        vat,
        total,
        marginPercentage: marginPercent,
        originalMarginPercentage,
      };
    }
    return {
      cost: adjustedCost,
      alcoholTax,
      shipping: shippingPerBottleSek > 0 ? shippingPerBottleSek : undefined,
      margin,
      vat,
      total,
      marginPercentage: marginPercent,
      originalMarginPercentage,
    };
  }

  return {
    cost: costInSek,
    alcoholTax,
    shipping: shippingPerBottleSek > 0 ? shippingPerBottleSek : undefined,
    margin,
    vat,
    total,
    marginPercentage: marginPercent,
    originalMarginPercentage,
  };
}

/**
 * Decompose B2C retail price inkl. moms into cost, alcohol tax, margin, VAT
 * using the business margin % (no member discount — list price is the anchor).
 */
function decomposeRetailPriceInclVat(
  totalInclVat: number,
  wine: Pick<
    WinePricingData,
    "alcohol_tax_cents" | "margin_percentage"
  >,
): Pick<
  PriceBreakdownResult,
  "cost" | "alcoholTax" | "margin" | "vat" | "total"
> {
  const marginPercent = wine.margin_percentage;

  const alcoholTax = Math.ceil((wine.alcohol_tax_cents / 100) * 100) / 100;

  const priceBeforeVat = totalInclVat / 1.25;
  const vat = Math.ceil((totalInclVat - priceBeforeVat) * 100) / 100;

  const costInSek = Math.ceil(
    ((priceBeforeVat - alcoholTax) / (1 + marginPercent / 100)) * 100,
  ) / 100;

  const margin = Math.ceil((costInSek * (marginPercent / 100)) * 100) / 100;

  let calculatedTotal = Math.ceil(
    (costInSek + alcoholTax + margin + vat) * 100,
  ) / 100;

  const expectedTotal = totalInclVat;
  const diff = expectedTotal - calculatedTotal;
  if (Math.abs(diff) >= 0.01) {
    const adjustedCost = Math.ceil((costInSek + diff) * 100) / 100;
    calculatedTotal = Math.ceil(
      (adjustedCost + alcoholTax + margin + vat) * 100,
    ) / 100;
    const finalDiff = expectedTotal - calculatedTotal;
    if (Math.abs(finalDiff) >= 0.01) {
      const finalCost = Math.ceil((adjustedCost + finalDiff) * 100) / 100;
      calculatedTotal = expectedTotal;
      return {
        cost: finalCost,
        alcoholTax,
        margin,
        vat,
        total: calculatedTotal,
      };
    }
    return {
      cost: adjustedCost,
      alcoholTax,
      margin,
      vat,
      total: calculatedTotal,
    };
  }

  return {
    cost: costInSek,
    alcoholTax,
    margin,
    vat,
    total: calculatedTotal,
  };
}

/**
 * Member discount on B2C list price — matches {@link MemberPrice} / shop cards:
 * ceil(listPrice * (1 - discount/100)) after float normalization.
 */
export function memberDiscountedTotalInclVat(
  listPriceInclVat: number,
  memberDiscountPercent: number,
): number {
  if (memberDiscountPercent <= 0) return listPriceInclVat;
  const raw = listPriceInclVat * (1 - memberDiscountPercent / 100);
  return Math.ceil(Number.parseFloat(raw.toFixed(2)));
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
  const listTotalInclVat = Math.ceil(wine.base_price_cents / 100);
  const originalMarginPercentage = wine.margin_percentage;

  const base = decomposeRetailPriceInclVat(listTotalInclVat, wine);

  if (memberDiscountPercent <= 0) {
    return {
      ...base,
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
    total: discountedTotal,
    marginPercentage: originalMarginPercentage,
    originalMarginPercentage,
    memberDiscountAmount,
    listTotalInclVat,
  };
}

/**
 * Format currency amount for display
 * @param amount - Amount in SEK
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  // Round up to nearest whole number to match formatPrice behavior
  const roundedAmount = Math.ceil(amount);
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
}

/** Format for price breakdown (2 decimals, rounded) so e.g. 22.19 shows as 22,19 kr */
export function formatCurrencyBreakdown(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/** Total price without decimals – round to nearest integer (120.20 → 120, 120.59 → 121) */
export function formatCurrencyWhole(amount: number): string {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
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
