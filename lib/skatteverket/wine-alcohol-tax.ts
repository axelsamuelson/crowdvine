/**
 * Swedish alcohol tax (alkoholskatt) for still wine / fermented wine
 * by ABV band — pure helpers for Skatteverket reporting snapshots.
 *
 * Pricing elsewhere still uses the flat per-bottle default in
 * `lib/wine-alcohol-tax.ts` (DEFAULT_ALCOHOL_TAX_CENTS). Do not conflate
 * the two: this module is for statutory band rates × litres.
 *
 * Source rates (SEK per litre of finished wine), in force from 1 Jan 2024:
 * Skatteverket — "Skattesatser för alkohol" (vin och andra jästa drycker)
 * https://www.skatteverket.se/foretag/skatterochavdrag/punktskatter/alkoholskatt/skattesatserforalkohol.4.4a47257e143e26725aecb5.html
 * and Lag (2022:156) om alkoholskatt 2 kap. 3 §.
 *
 * Bands (volymprocent → SEK/liter):
 * - över 1,2 högst 2,25 → 0,00
 * - över 2,25 högst 4,5 → 10,38
 * - över 4,5 högst 7 → 15,34
 * - över 7 högst 8,5 → 21,12
 * - över 8,5 högst 15 → 29,58
 * - över 15 högst 18 → 61,90 (vin only)
 *
 * IMPORTANT: Ingrid (CFO) must verify these rates before go-live.
 * Small-producer reduced rates (3 a §) are NOT applied here.
 */

/** SEK per litre by upper-inclusive ABV band for wine. */
export const SWEDISH_WINE_ALCOHOL_TAX_SEK_PER_LITER = [
  { maxAbvInclusive: 2.25, sekPerLiter: 0 },
  { maxAbvInclusive: 4.5, sekPerLiter: 10.38 },
  { maxAbvInclusive: 7, sekPerLiter: 15.34 },
  { maxAbvInclusive: 8.5, sekPerLiter: 21.12 },
  { maxAbvInclusive: 15, sekPerLiter: 29.58 },
  { maxAbvInclusive: 18, sekPerLiter: 61.9 },
] as const;

export type WineAlcoholTaxBandResult = {
  sekPerLiter: number;
  /** Band upper bound (inclusive), or null when out of wine tax scope. */
  maxAbvInclusive: number | null;
};

/**
 * Resolve SEK/liter rate for still wine at the given ABV (%).
 * Returns null when ABV is missing/invalid or outside wine tax bands
 * (≤1.2% or >18%). Callers must not invent a rate.
 */
export function swedishWineAlcoholTaxSekPerLiter(
  abvPercent: number | null | undefined,
): WineAlcoholTaxBandResult | null {
  if (abvPercent == null || !Number.isFinite(abvPercent)) return null;
  if (abvPercent <= 1.2 || abvPercent > 18) return null;

  for (const band of SWEDISH_WINE_ALCOHOL_TAX_SEK_PER_LITER) {
    if (abvPercent <= band.maxAbvInclusive) {
      return {
        sekPerLiter: band.sekPerLiter,
        maxAbvInclusive: band.maxAbvInclusive,
      };
    }
  }
  return null;
}

/**
 * Line alcohol tax in SEK = rate(SEK/L) × total litres.
 * Rounded to öre (2 decimal SEK) via Math.round on öre.
 * Returns null when rate or volume cannot be determined.
 */
export function computeSwedishWineAlcoholTaxSek(opts: {
  abvPercent: number | null | undefined;
  volumeLiters: number | null | undefined;
}): number | null {
  const band = swedishWineAlcoholTaxSekPerLiter(opts.abvPercent);
  if (!band) return null;
  const liters = opts.volumeLiters;
  if (liters == null || !Number.isFinite(liters) || liters <= 0) return null;
  const ore = Math.round(band.sekPerLiter * liters * 100);
  return ore / 100;
}

/**
 * Parse a numeric ABV percent from wine `abv` text and/or `alcohol_percentage`.
 * Never invents a value — returns null when both are absent/unparseable.
 */
export function parseWineAbvPercent(
  abv: string | null | undefined,
  alcoholPercentage: string | number | null | undefined,
): number | null {
  const fromPct = coerceAbvNumber(alcoholPercentage);
  if (fromPct != null) return fromPct;

  const text = abv?.trim();
  if (!text) return null;
  // "13.5 %", "13,5%", "13.5"
  const normalized = text.replace(",", ".").replace(/%/g, "").trim();
  return coerceAbvNumber(normalized);
}

function coerceAbvNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num < 0 || num > 100) return null;
  return num;
}
