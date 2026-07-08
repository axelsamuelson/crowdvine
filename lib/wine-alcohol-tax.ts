export const DEFAULT_ALCOHOL_TAX_CENTS = 2219;

/** Standard Swedish alcohol tax per bottle (22,19 kr) when not set on the wine. */
export function resolveWineAlcoholTaxCents(
  alcoholTaxCents?: number | null,
): number {
  if (alcoholTaxCents != null && alcoholTaxCents > 0) {
    return alcoholTaxCents;
  }
  return DEFAULT_ALCOHOL_TAX_CENTS;
}
