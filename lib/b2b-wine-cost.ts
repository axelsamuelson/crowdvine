/**
 * Calculate wine cost ex VAT in öre (cents) from DB fields.
 * costInSek = cost_amount * exchange_rate + alcohol_tax_cents/100
 * costInOre = costInSek * 100 = cost_amount * exchange_rate * 100 + alcohol_tax_cents
 */
export function getWineCostCentsExVat(wine: {
  cost_amount?: number;
  exchange_rate?: number;
  alcohol_tax_cents?: number;
}): number {
  const costAmount = wine.cost_amount ?? 0;
  const exchangeRate = wine.exchange_rate ?? 1;
  const alcoholTaxCents = wine.alcohol_tax_cents ?? 0;
  const costInSek = costAmount * exchangeRate + alcoholTaxCents / 100;
  return Math.round(costInSek * 100);
}
