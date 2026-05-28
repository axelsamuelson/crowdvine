export type WineCostFields = {
  cost_amount?: number;
  cost_currency?: string | null;
  exchange_rate?: number | null;
  alcohol_tax_cents?: number;
};

/**
 * Resolve SEK exchange rate: stored rate, live rate map, or 1 for SEK.
 */
export function getEffectiveExchangeRate(
  wine: WineCostFields,
  rateMap?: Record<string, number>,
): number {
  const currency = (wine.cost_currency || "SEK").toUpperCase();
  if (currency === "SEK") return 1;
  if (wine.exchange_rate != null && Number.isFinite(wine.exchange_rate)) {
    return wine.exchange_rate;
  }
  return rateMap?.[currency] ?? 1;
}

/**
 * Calculate wine cost ex VAT in öre (cents) from DB fields.
 * costInSek = cost_amount * exchange_rate + alcohol_tax_cents/100
 */
export function getWineCostCentsExVat(
  wine: WineCostFields,
  rateMap?: Record<string, number>,
): number {
  const costAmount = wine.cost_amount ?? 0;
  const exchangeRate = getEffectiveExchangeRate(wine, rateMap);
  const alcoholTaxCents = wine.alcohol_tax_cents ?? 0;
  const costInSek = costAmount * exchangeRate + alcoholTaxCents / 100;
  return Math.round(costInSek * 100);
}

/** Inköpspris per flaska i öre (valuta × kurs, utan alkoholskatt). */
export function getWinePurchaseCostCentsPerBottle(
  wine: WineCostFields,
  rateMap?: Record<string, number>,
): number {
  const costAmount = wine.cost_amount ?? 0;
  const exchangeRate = getEffectiveExchangeRate(wine, rateMap);
  return Math.round(costAmount * exchangeRate * 100);
}

/** Alkoholskatt per flaska i öre. */
export function getWineAlcoholTaxCentsPerBottle(wine: WineCostFields): number {
  return wine.alcohol_tax_cents ?? 0;
}

export type PalletLineCost = {
  purchaseCentsPerBottle: number;
  alcoholTaxCentsPerBottle: number;
  unitTotalCentsPerBottle: number;
  linePurchaseCents: number;
  lineAlcoholTaxCents: number;
  lineTotalCents: number;
};

/** Per-rad: inköp, alkoholskatt och totalt (override = totalt, inköp = totalt − skatt). */
export function getPalletLineCost(
  quantity: number,
  costCentsOverride: number | null,
  wine: WineCostFields | undefined,
  rateMap?: Record<string, number>,
): PalletLineCost {
  const qty = Math.max(0, quantity || 0);
  const alcoholTaxCentsPerBottle = wine
    ? getWineAlcoholTaxCentsPerBottle(wine)
    : 0;

  let unitTotalCentsPerBottle = 0;
  let purchaseCentsPerBottle = 0;

  if (costCentsOverride != null) {
    unitTotalCentsPerBottle = costCentsOverride;
    purchaseCentsPerBottle = Math.max(
      0,
      costCentsOverride - alcoholTaxCentsPerBottle,
    );
  } else if (wine) {
    purchaseCentsPerBottle = getWinePurchaseCostCentsPerBottle(wine, rateMap);
    unitTotalCentsPerBottle = purchaseCentsPerBottle + alcoholTaxCentsPerBottle;
  }

  return {
    purchaseCentsPerBottle,
    alcoholTaxCentsPerBottle,
    unitTotalCentsPerBottle,
    linePurchaseCents: purchaseCentsPerBottle * qty,
    lineAlcoholTaxCents: alcoholTaxCentsPerBottle * qty,
    lineTotalCents: unitTotalCentsPerBottle * qty,
  };
}

export type PalletCostSummary = {
  totalBottles: number;
  winePurchaseCents: number;
  wineAlcoholTaxCents: number;
  wineTotalCents: number;
  palletCostCents: number;
  grandTotalCents: number;
};

export function computePalletCostSummary(
  lines: Array<{
    quantity: number;
    cost_cents_override: number | null;
    wine?: WineCostFields;
  }>,
  palletCostCents: number,
  rateMap?: Record<string, number>,
): PalletCostSummary {
  let totalBottles = 0;
  let winePurchaseCents = 0;
  let wineAlcoholTaxCents = 0;
  let wineTotalCents = 0;

  for (const line of lines) {
    const qty = line.quantity || 0;
    totalBottles += qty;
    const costs = getPalletLineCost(
      qty,
      line.cost_cents_override,
      line.wine,
      rateMap,
    );
    winePurchaseCents += costs.linePurchaseCents;
    wineAlcoholTaxCents += costs.lineAlcoholTaxCents;
    wineTotalCents += costs.lineTotalCents;
  }

  const pallet = Math.max(0, palletCostCents || 0);
  return {
    totalBottles,
    winePurchaseCents,
    wineAlcoholTaxCents,
    wineTotalCents,
    palletCostCents: pallet,
    grandTotalCents: wineTotalCents + pallet,
  };
}

export function formatSekFromCents(cents: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Collect non-SEK currencies from wines that may need a live FX rate. */
export function collectCurrenciesNeedingRates(wines: WineCostFields[]): string[] {
  const set = new Set<string>();
  for (const w of wines) {
    const currency = (w.cost_currency || "SEK").toUpperCase();
    if (currency === "SEK") continue;
    const needsRate =
      w.exchange_rate == null && (w.cost_amount ?? 0) > 0;
    if (needsRate) set.add(currency);
  }
  return [...set];
}
