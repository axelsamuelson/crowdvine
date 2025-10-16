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
 * Fetch current exchange rate from API
 * @param from - Source currency (e.g., 'EUR')
 * @param to - Target currency (e.g., 'SEK')
 * @returns Exchange rate
 */
async function fetchExchangeRate(from: string, to: string): Promise<number> {
  try {
    const response = await fetch(
      `/api/exchange-rates?from=${from}&to=${to}`,
      { cache: 'no-store' } // Always get fresh rate
    );
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.rate;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    // Fallback to stored exchange rate or default
    return 11.25; // Default EUR to SEK rate
  }
}

/**
 * Calculate detailed price breakdown for a wine
 * @param wine - Wine pricing data from database
 * @param memberDiscountPercent - Member discount percentage (0-100)
 * @returns Detailed price breakdown in SEK
 */
export async function calculatePriceBreakdown(
  wine: WinePricingData,
  memberDiscountPercent: number = 0
): Promise<PriceBreakdownResult> {
  // Fetch current exchange rate from API (assuming cost is in EUR)
  const currentExchangeRate = await fetchExchangeRate('EUR', 'SEK');
  
  // Convert cost from EUR to SEK using current exchange rate
  const costInSek = wine.cost_amount * currentExchangeRate;
  
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

/**
 * Synchronous version for cases where we already have the exchange rate
 * @param wine - Wine pricing data from database
 * @param memberDiscountPercent - Member discount percentage (0-100)
 * @param exchangeRate - Current exchange rate (EUR to SEK)
 * @returns Detailed price breakdown in SEK
 */
export function calculatePriceBreakdownSync(
  wine: WinePricingData,
  memberDiscountPercent: number = 0,
  exchangeRate: number = 11.25
): PriceBreakdownResult {
  // Convert cost from EUR to SEK using provided exchange rate
  const costInSek = wine.cost_amount * exchangeRate;
  
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
