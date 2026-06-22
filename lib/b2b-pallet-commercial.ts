import { getEffectiveExchangeRate, getPalletLineCost, type WineCostFields } from "@/lib/b2b-wine-cost";
import { resolveWineAlcoholTaxCents } from "@/lib/wine-retail-pricing";
import { calculateB2BPriceExclVat } from "@/lib/price-breakdown";

export const B2B_VAT_MULTIPLIER = 1.25;
export const DEFAULT_B2B_MARGIN_PERCENT = 15;

export type WineCommercialFields = WineCostFields & {
  b2b_margin_percentage?: number | null;
};

export function getPalletShippingPerBottleSek(
  palletCostCents: number,
  totalBottles: number,
): number {
  if (totalBottles <= 0 || palletCostCents <= 0) return 0;
  return palletCostCents / 100 / totalBottles;
}

export function resolveB2bMarginPercent(
  marginOverride: number | null | undefined,
  wineMargin: number | null | undefined,
): number | null {
  if (
    marginOverride != null &&
    Number.isFinite(marginOverride) &&
    marginOverride >= 0 &&
    marginOverride < 100
  ) {
    return marginOverride;
  }
  if (
    wineMargin != null &&
    Number.isFinite(wineMargin) &&
    wineMargin >= 0 &&
    wineMargin < 100
  ) {
    return wineMargin;
  }
  return DEFAULT_B2B_MARGIN_PERCENT;
}

/** B2B customer price per bottle in SEK (ex moms), same formula as shop. */
export function computeB2bCustomerUnitPriceExclVatSek(
  wine: WineCommercialFields | undefined,
  shippingPerBottleSek: number,
  marginPercent: number | null,
  rateMap?: Record<string, number>,
): number | null {
  if (!wine || marginPercent == null || marginPercent < 0 || marginPercent >= 100) {
    return null;
  }
  const costAmount = wine.cost_amount ?? 0;
  if (costAmount <= 0) return null;

  const exchangeRate = getEffectiveExchangeRate(wine, rateMap);
  const alcoholTaxCents = resolveWineAlcoholTaxCents(wine.alcohol_tax_cents);

  return calculateB2BPriceExclVat(
    costAmount,
    exchangeRate,
    alcoholTaxCents,
    marginPercent,
    shippingPerBottleSek,
  );
}

export function sekExclToDisplayCents(
  amountExclVatSek: number,
  showInclVat: boolean,
): number {
  const sek = showInclVat ? amountExclVatSek * B2B_VAT_MULTIPLIER : amountExclVatSek;
  return Math.round(sek * 100);
}

export type PalletCommercialLine = {
  marginPercent: number | null;
  unitCustomerPriceExclVatSek: number | null;
  unitCustomerDisplayCents: number | null;
  lineCustomerValueCents: number;
  lineLandedCostCents: number;
  lineProfitExclVatCents: number;
};

export type PalletCommercialSummary = {
  shippingPerBottleSek: number;
  marginOverride: number | null;
  totalCommercialValueCents: number;
  totalLandedCostCents: number;
  totalProfitExclVatCents: number;
  totalProfitDisplayCents: number;
  lineByWineId: Map<string, PalletCommercialLine>;
};

export function computePalletCommercialSummary(
  lines: Array<{
    wine_id: string;
    quantity: number;
    cost_cents_override: number | null;
    wine?: WineCommercialFields;
  }>,
  palletCostCents: number,
  marginOverride: number | null,
  showInclVat: boolean,
  rateMap?: Record<string, number>,
): PalletCommercialSummary {
  const totalBottles = lines.reduce((s, l) => s + Math.max(0, l.quantity || 0), 0);
  const shippingPerBottleSek = getPalletShippingPerBottleSek(
    palletCostCents,
    totalBottles,
  );

  const lineByWineId = new Map<string, PalletCommercialLine>();
  let totalCommercialValueCents = 0;
  let totalLandedCostCents = 0;

  for (const line of lines) {
    const qty = Math.max(0, line.quantity || 0);
    const landed = getPalletLineCost(
      qty,
      line.cost_cents_override,
      line.wine,
      rateMap,
    );
    const lineLandedCostCents =
      landed.lineTotalCents +
      Math.round(shippingPerBottleSek * 100) * qty;

    const marginPercent = resolveB2bMarginPercent(
      marginOverride,
      line.wine?.b2b_margin_percentage,
    );
    const unitExcl = computeB2bCustomerUnitPriceExclVatSek(
      line.wine,
      shippingPerBottleSek,
      marginPercent,
      rateMap,
    );
    const unitDisplayCents =
      unitExcl != null ? sekExclToDisplayCents(unitExcl, showInclVat) : null;
    const lineCustomerValueCents =
      unitDisplayCents != null ? unitDisplayCents * qty : 0;

    const lineProfitExclVatCents =
      unitExcl != null
        ? Math.round(unitExcl * 100) * qty - lineLandedCostCents
        : 0;

    lineByWineId.set(line.wine_id, {
      marginPercent,
      unitCustomerPriceExclVatSek: unitExcl,
      unitCustomerDisplayCents: unitDisplayCents,
      lineCustomerValueCents,
      lineLandedCostCents,
      lineProfitExclVatCents,
    });

    totalCommercialValueCents += lineCustomerValueCents;
    totalLandedCostCents += lineLandedCostCents;
  }

  const totalProfitExclVatCents = lines.reduce((sum, line) => {
    const row = lineByWineId.get(line.wine_id);
    return sum + (row?.lineProfitExclVatCents ?? 0);
  }, 0);

  const totalProfitDisplayCents = showInclVat
    ? totalCommercialValueCents -
      Math.round(totalLandedCostCents * B2B_VAT_MULTIPLIER)
    : totalProfitExclVatCents;

  return {
    shippingPerBottleSek,
    marginOverride,
    totalCommercialValueCents,
    totalLandedCostCents,
    totalProfitExclVatCents,
    totalProfitDisplayCents,
    lineByWineId,
  };
}

export function commercialPriceColumnLabel(showInclVat: boolean): string {
  return showInclVat ? "Kundvärde/fl (inkl. moms)" : "Kundvärde/fl (ex moms)";
}

export function commercialLineColumnLabel(showInclVat: boolean): string {
  return showInclVat ? "Rad kundvärde (inkl. moms)" : "Rad kundvärde (ex moms)";
}
