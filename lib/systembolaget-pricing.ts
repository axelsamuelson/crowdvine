/**
 * Calculate Systembolaget price using the same formula as our prices but with 14.7% margin
 * 
 * Formula (same as our pricing):
 * 1. cost_amount * exchange_rate = costInSek
 * 2. costInSek * (1 + 14.7%) = priceBeforeTax (instead of our margin_percentage)
 * 3. priceBeforeTax + alcohol_tax_cents = priceAfterTax
 * 4. priceAfterTax * 1.25 = finalPrice (VAT included)
 * 
 * @param costAmount - The cost amount in original currency
 * @param exchangeRate - Exchange rate to SEK (default 1.0)
 * @param alcoholTaxCents - Alcohol tax in cents (default 0)
 * @returns The calculated Systembolaget price
 */
export function calculateSystembolagetPrice(
  costAmount: number,
  exchangeRate: number = 1.0,
  alcoholTaxCents: number = 0
): number {
  // Same calculation as our prices but with 14.7% margin instead of our margin
  const costInSek = costAmount * exchangeRate;
  const priceBeforeTax = costInSek * (1 + 0.147); // 14.7% margin
  const priceAfterTax = priceBeforeTax + (alcoholTaxCents / 100.0);
  const finalPrice = priceAfterTax * 1.25; // VAT included
  
  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Systembolaget price for a wine with detailed breakdown
 * 
 * @param costAmount - The cost amount in original currency
 * @param exchangeRate - Exchange rate to SEK (default 1.0)
 * @param alcoholTaxCents - Alcohol tax in cents (default 0)
 * @returns Detailed breakdown of the price calculation
 */
export function calculateSystembolagetPriceBreakdown(
  costAmount: number,
  exchangeRate: number = 1.0,
  alcoholTaxCents: number = 0
) {
  const costInSek = costAmount * exchangeRate;
  const marginAmount = costInSek * 0.147; // 14.7% margin
  const priceBeforeTax = costInSek + marginAmount;
  const priceAfterTax = priceBeforeTax + (alcoholTaxCents / 100.0);
  const vat = priceAfterTax * 0.25;
  const finalPrice = priceAfterTax + vat;
  
  return {
    costAmount,
    exchangeRate,
    costInSek: Math.round(costInSek * 100) / 100,
    marginPercentage: 14.7,
    marginAmount: Math.round(marginAmount * 100) / 100,
    priceBeforeTax: Math.round(priceBeforeTax * 100) / 100,
    alcoholTaxCents,
    alcoholTaxSek: Math.round((alcoholTaxCents / 100.0) * 100) / 100,
    priceAfterTax: Math.round(priceAfterTax * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100
  };
}
