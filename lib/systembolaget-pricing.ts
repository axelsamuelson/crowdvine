/**
 * Calculate Systembolaget price using gross margin formula with ~12.5% effective margin
 *
 * Formula (gross margin approach):
 * 1. cost_amount * exchange_rate + alcohol_tax = costInSek (total cost ex VAT)
 * 2. priceExVat = costInSek ÷ (1 - margin) where margin = effective margin ex VAT
 * 3. finalPrice = priceExVat × 1.25 (VAT included)
 *
 * Systembolaget's effective margin appears to be around 12.5% of final price
 * This translates to roughly 14.7% gross margin ex VAT
 *
 * @param costAmount - The cost amount in original currency
 * @param exchangeRate - Exchange_rate to SEK (default 1.0)
 * @param alcoholTaxCents - Alcohol tax in cents (default 0)
 * @returns The calculated Systembolaget price
 */
export function calculateSystembolagetPrice(
  costAmount: number,
  exchangeRate: number = 1.0,
  alcoholTaxCents: number = 0,
): number {
  // Calculate total cost (C): cost_amount + alcohol_tax converted to SEK
  const costAmountInSek = costAmount * exchangeRate;
  const alcoholTaxInSek = alcoholTaxCents / 100;
  const costInSek = costAmountInSek + alcoholTaxInSek; // C = Total cost ex VAT
  
  // Systembolaget's gross margin appears to be around 14.7% ex VAT
  const sbMarginDecimal = 0.147;
  
  // Price ex VAT using gross margin formula: P = C ÷ (1 - M)
  const priceExVat = costInSek / (1 - sbMarginDecimal);
  
  // Final price incl VAT: F = P × 1.25
  const finalPrice = priceExVat * 1.25;

  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Systembolaget price for a wine with detailed breakdown using gross margin
 *
 * @param costAmount - The cost amount in original currency
 * @param exchangeRate - Exchange rate to SEK (default 1.0)
 * @param alcoholTaxCents - Alcohol tax in cents (default 0)
 * @returns Detailed breakdown of the price calculation using gross margin formula
 */
export function calculateSystembolagetPriceBreakdown(
  costAmount: number,
  exchangeRate: number = 1.0,
  alcoholTaxCents: number = 0,
) {
  // Calculate total cost (C): cost_amount + alcohol_tax converted to SEK
  const costAmountInSek = costAmount * exchangeRate;
  const alcoholTaxInSek = alcoholTaxCents / 100;
  const costInSek = costAmountInSek + alcoholTaxInSek; // C = Total cost ex VAT
  
  // Systembolaget's gross margin appears to be around 14.7% ex VAT
  const sbMarginDecimal = 0.147;
  
  // Price ex VAT using gross margin formula: P = C ÷ (1 - M)
  const priceExVat = costInSek / (1 - sbMarginDecimal);
  
  // Calculate VAT (25%)
  const vat = priceExVat * 0.25;
  
  // Final price incl VAT: F = P × 1.25
  const finalPrice = priceExVat + vat;
  
  // Calculate margin amount
  const marginAmount = priceExVat - costInSek;

  return {
    costAmount,
    exchangeRate,
    costAmountInSek: Math.round(costAmountInSek * 100) / 100,
    alcoholTaxCents,
    alcoholTaxInSek: Math.round(alcoholTaxInSek * 100) / 100,
    costInSek: Math.round(costInSek * 100) / 100,
    marginPercentageExVat: 14.7,
    marginAmount: Math.round(marginAmount * 100) / 100,
    priceExVat: Math.round(priceExVat * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    effectiveMarginPercent: Math.round(((finalPrice - costInSek) / finalPrice) * 100 * 100) / 100,
  };
}
