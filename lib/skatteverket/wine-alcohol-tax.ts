/**
 * Swedish alcohol tax (alkoholskatt) for still wine / fermented wine
 * by ABV band — pure helpers for Skatteverket reporting snapshots.
 *
 * Pricing elsewhere still uses the flat per-bottle default in
 * `lib/wine-alcohol-tax.ts` (DEFAULT_ALCOHOL_TAX_CENTS). Do not conflate
 * the two: this module is for statutory band rates × litres.
 *
 * Source rates (SEK per litre of finished wine), in force from 1 Jan 2024
 * (verified by Ingrid / CFO against Skatteverket; SFS 2026:738 notes
 * small-producer reductions from 2026-07-01 — NOT applied here):
 * Skatteverket — "Skattesatser för alkohol" (vin och andra jästa drycker)
 * https://www.skatteverket.se/foretag/skatterochavdrag/punktskatter/alkoholskatt/skattesatserforalkohol.4.4a47257e143e26725aecb5.html
 * and Lag (2022:156) om alkoholskatt 2 kap. 3 §.
 *
 * Band rule is the law's "över X, högst Y" (over X, at most Y) — no gaps:
 * - högst 2,25 → 0,00
 * - över 2,25 högst 4,5 → 10,38
 * - över 4,5 högst 7 → 15,34
 * - över 7 högst 8,5 → 21,12
 * - över 8,5 högst 15 → 29,58
 * - över 15 högst 18 → 61,90 (vin only; alcohol from fermentation, no additives)
 * - över 18 → out of scope (null)
 *
 * TODO: The 61,90 band and still-wine bands assume non-fortified wine.
 * Mellanklassprodukt / fortified wine under 15% would be 37,34 kr/l — we do
 * NOT apply that rate. If wine fields indicate fortified/mellanklass, callers
 * must set needs_review with null tax (see wineIndicatesFortifiedOrMellanklass).
 * product_tax_category on the snapshot table is reserved for a future
 * explicit category; leave it NULL until we have one.
 *
 * Small-producer reduction (SFS 2026:738, 3 a §, from 2026-07-01): keep full
 * tax. Snapshot column small_producer_reduction_pct stays NULL until a
 * producer certificate is available.
 */

/** SEK per litre by upper-inclusive ABV band for still wine ("högst Y"). */
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
  /** Band upper bound (inclusive / "högst"), or null when out of scope. */
  maxAbvInclusive: number | null;
};

/**
 * Resolve SEK/liter rate for still wine at the given ABV (%).
 * Boundaries follow "över X, högst Y" via sequential `<= max` checks so
 * values such as 2.255 / 7.005 land in the next band with no gaps.
 * Returns null when ABV is missing/invalid or >18%.
 */
export function swedishWineAlcoholTaxSekPerLiter(
  abvPercent: number | null | undefined,
): WineAlcoholTaxBandResult | null {
  if (abvPercent == null || !Number.isFinite(abvPercent)) return null;
  if (abvPercent < 0 || abvPercent > 18) return null;

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
 * Line alcohol tax in SEK.
 *
 * Rounding rule (mandatory): multiply rate × the line's TOTAL litres
 * (quantity × bottle volume) first, then round ONCE to 2 decimals (öre).
 * Never round per bottle and multiply — that yields 22.19×6 = 133.14 instead
 * of the correct 29.58×4.5 = 133.11. All snapshot paths (pallet close,
 * direct_box confirm, legacy auto-charge) must call this helper only.
 *
 * Returns null when rate or volume cannot be determined.
 */
export function computeSwedishWineAlcoholTaxSek(opts: {
  abvPercent: number | null | undefined;
  /** Total litres for the line (bottle litres × quantity), not per bottle. */
  volumeLiters: number | null | undefined;
}): number | null {
  const band = swedishWineAlcoholTaxSekPerLiter(opts.abvPercent);
  if (!band) return null;
  const liters = opts.volumeLiters;
  if (liters == null || !Number.isFinite(liters) || liters <= 0) return null;
  // Round once on the line total (öre), never per-bottle then × qty.
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

/**
 * True when wine fields clearly indicate fortified wine / mellanklass /
 * starkvin. We never invent the 37,34 kr/l mellanklass rate — callers must
 * flag needs_review instead.
 */
export function wineIndicatesFortifiedOrMellanklass(fields: {
  wineName?: string | null;
  color?: string | null;
  classification?: string | null;
  tags?: string | string[] | null;
  additives?: string | null;
}): boolean {
  const haystacks: string[] = [];
  for (const value of [
    fields.wineName,
    fields.color,
    fields.classification,
    fields.additives,
  ]) {
    const t = value?.trim();
    if (t) haystacks.push(t);
  }
  if (Array.isArray(fields.tags)) {
    for (const tag of fields.tags) {
      const t = tag?.trim();
      if (t) haystacks.push(t);
    }
  } else if (typeof fields.tags === "string" && fields.tags.trim()) {
    haystacks.push(fields.tags.trim());
  }

  if (haystacks.length === 0) return false;

  // Explicit product-type markers only — do not match ordinary tasting notes.
  const re =
    /\b(fortified|mellanklass|mellanklassprodukt|starkvin|likörvin|portvin|port\b|sherry|madeira|vermouth|vin\s*doux\s*naturel|vdn)\b/i;

  return haystacks.some((text) => re.test(text));
}

function coerceAbvNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num < 0 || num > 100) return null;
  return num;
}
