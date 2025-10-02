// Test the new gross margin pricing formula
// Example from user: Cost = 104.77 SEK, Margin = 10%, VAT = 25%

function calculateGrossMarginPrice(costInSek, marginPercent, includesVat) {
  // Cost (C) = 104.77 SEK
  const C = costInSek;
  
  // Gross margin as decimal (e.g., 10% = 0.10)
  const M = marginPercent / 100;
  
  // VAT rate (Sweden = 25%)
  const V = includesVat ? 0.25 : 0;
  
  // Step 1: Price ex VAT using gross margin formula: P = C ÷ (1 - M)
  const P = C / (1 - M);
  
  // Step 2: Final price incl VAT: F = P × (1 + V)
  const F = P * (1 + V);
  
  // Calculate effective margin as % of final price
  const effectiveMarginPercent = ((F - C) / F) * 100;
  
  return {
    costInSek: C.toFixed(2),
    priceExVat: P.toFixed(2),
    finalPrice: F.toFixed(2),
    effectiveMarginPercent: effectiveMarginPercent.toFixed(1),
    marginAmount: (P - C).toFixed(2)
  };
}

// Test with user's example
console.log("=== User Example ===");
console.log("Cost: 104.77 SEK");
console.log("Margin: 10%");
console.log("Includes VAT: Yes");

const result = calculateGrossMarginPrice(104.77, 10, true);
console.log("\nResults:");
console.log("Cost (C): " + result.costInSek + " SEK");
console.log("Price ex VAT (P): " + result.priceExVat + " SEK");
console.log("Final price inc VAT (F): " + result.finalPrice + " SEK");
console.log("Effective margin: " + result.effectiveMarginPercent + "%");
console.log("Margin amount: " + result.marginAmount + " SEK");

// Verify expected results
// Expected: P = 104.77 ÷ (1 - 0.10) = 116.41 SEK
// Expected: F = 116.41 × 1.25 = 145.51 SEK
console.log("\nVerification:");
console.log("Expected P: 116.41 SEK");
console.log("Calculated P: " + result.priceExVat + " SEK");
console.log("Expected F: 145.51 SEK");
console.log("Calculated F: " + result.finalPrice + " SEK");

// Test with different margin
console.log("\n=== Test: 15% Margin ===");
const result15 = calculateGrossMarginPrice(104.77, 15, true);
console.log("15% margin:");
console.log("Price ex VAT: " + result15.priceExVat + " SEK");
console.log("Final price: " + result15.finalPrice + " SEK");
console.log("Effective margin: " + result15.effectiveMarginPercent + "%");
