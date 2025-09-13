/**
 * Calculate Systembolaget price based on supplier price
 * 
 * Formula:
 * 1. Supplier price + General markup (14.7%) + Product group markup (wine: 5.40 SEK)
 * 2. + Alcohol tax (29.58 SEK per liter for wine)
 * 3. + VAT (25%)
 * 
 * @param supplierPrice - The supplier price in SEK
 * @param volume - Volume in liters (default 0.75 for standard wine bottle)
 * @returns The calculated Systembolaget price
 */
export function calculateSystembolagetPrice(
  supplierPrice: number, 
  volume: number = 0.75
): number {
  // Step 1: Calculate base price with markups
  const generalMarkup = supplierPrice * 0.147; // 14.7% general markup
  const productGroupMarkup = 5.40; // Wine product group markup
  const priceAfterMarkup = supplierPrice + generalMarkup + productGroupMarkup;
  
  // Step 2: Add alcohol tax
  const alcoholTaxPerLiter = 29.58; // SEK per liter for wine
  const alcoholTax = volume * alcoholTaxPerLiter;
  const priceAfterTax = priceAfterMarkup + alcoholTax;
  
  // Step 3: Add VAT (25%)
  const vat = priceAfterTax * 0.25;
  const finalPrice = priceAfterTax + vat;
  
  return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Systembolaget price for a wine with detailed breakdown
 * 
 * @param supplierPrice - The supplier price in SEK
 * @param volume - Volume in liters (default 0.75 for standard wine bottle)
 * @returns Detailed breakdown of the price calculation
 */
export function calculateSystembolagetPriceBreakdown(
  supplierPrice: number, 
  volume: number = 0.75
) {
  const generalMarkup = supplierPrice * 0.147;
  const productGroupMarkup = 5.40;
  const priceAfterMarkup = supplierPrice + generalMarkup + productGroupMarkup;
  
  const alcoholTaxPerLiter = 29.58;
  const alcoholTax = volume * alcoholTaxPerLiter;
  const priceAfterTax = priceAfterMarkup + alcoholTax;
  
  const vat = priceAfterTax * 0.25;
  const finalPrice = priceAfterTax + vat;
  
  return {
    supplierPrice,
    generalMarkup: Math.round(generalMarkup * 100) / 100,
    productGroupMarkup,
    priceAfterMarkup: Math.round(priceAfterMarkup * 100) / 100,
    alcoholTax: Math.round(alcoholTax * 100) / 100,
    priceAfterTax: Math.round(priceAfterTax * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    volume
  };
}
