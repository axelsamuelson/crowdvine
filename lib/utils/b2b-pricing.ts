/**
 * B2B Pricing Utilities
 * Functions to handle B2B pricing (excluding VAT) vs normal pricing (including VAT)
 */

/**
 * Calculate price excluding VAT (for B2B)
 * @param priceIncludingVat - Price including 25% VAT
 * @returns Price excluding VAT
 */
export function calculatePriceExcludingVat(priceIncludingVat: number): number {
  // VAT is 25% in Sweden, so price excluding VAT = price / 1.25
  return priceIncludingVat / 1.25;
}

/**
 * Format price for display based on B2B mode
 * @param amount - Price amount (string or number)
 * @param currencyCode - Currency code (e.g., "SEK")
 * @param excludeVat - Whether to exclude VAT (B2B mode)
 * @returns Formatted price string
 */
export function formatPriceForB2B(
  amount: string | number,
  currencyCode: string,
  excludeVat: boolean = false,
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const displayAmount = excludeVat ? calculatePriceExcludingVat(numAmount) : numAmount;

  // Round up to nearest whole number
  const roundedAmount = Math.ceil(displayAmount);

  // Use Swedish locale for consistent formatting with 0 decimal places
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
}
