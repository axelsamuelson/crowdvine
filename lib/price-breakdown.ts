export interface WinePricingData {
  cost_amount: number;
  exchange_rate: number;
  alcohol_tax_cents: number;
  margin_percentage: number;
  base_price_cents: number;
}

export interface PriceBreakdownResult {
  cost: number;
  alcoholTax: number;
  margin: number;
  vat: number;
  total: number;
  marginPercentage: number;
  originalMarginPercentage: number;
}

/**
 * Calculate detailed price breakdown for a wine
 * @param wine - Wine pricing data from database
 * @param memberDiscountPercent - Member discount percentage (0-100)
 * @returns Detailed price breakdown in SEK
 */
export function calculatePriceBreakdown(
  wine: WinePricingData,
  memberDiscountPercent: number = 0
): PriceBreakdownResult {
  // Convert cost from EUR to SEK
  const costInSek = wine.cost_amount * wine.exchange_rate;
  
  // Convert alcohol tax from öre to SEK
  const alcoholTax = wine.alcohol_tax_cents / 100;
  
  // Store original margin percentage for display
  const originalMarginPercentage = wine.margin_percentage;
  
  // Apply member discount to margin percentage
  const marginPercent = wine.margin_percentage * (1 - memberDiscountPercent / 100);
  
  // Calculate margin amount
  const margin = costInSek * (marginPercent / 100);
  
  // Price before VAT
  const priceBeforeVat = costInSek + margin + alcoholTax;
  
  // VAT (25% in Sweden)
  const vat = priceBeforeVat * 0.25;
  
  // Total price
  const total = priceBeforeVat + vat;
  
  return {
    cost: costInSek,
    alcoholTax,
    margin,
    vat,
    total,
    marginPercentage: marginPercent,
    originalMarginPercentage,
  };
}

/**
 * Format currency amount for display
 * @param amount - Amount in SEK
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
    margin: (breakdown.margin / total) * 100,
    vat: (breakdown.vat / total) * 100,
  };
}
