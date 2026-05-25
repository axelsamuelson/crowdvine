/** Dirty Wine AB organisationsnummer (personnummer-format för enskild firma). */
export const DIRTY_WINE_ORG_NUMBER = "19940402-5133";

/** Dirty Wine momsregistreringsnummer (SE + personnummer utan bindestreck + 01). */
export const DIRTY_WINE_VAT_NUMBER = "SE94040253301";

/** Use stored org number when it looks valid; otherwise fall back to Dirty Wine default. */
export function resolveCompanyOrgNumber(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || !/\d/.test(trimmed)) return DIRTY_WINE_ORG_NUMBER;
  return trimmed;
}

/** Use stored VAT number when it looks valid; otherwise fall back to Dirty Wine default. */
export function resolveCompanyVatNumber(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || !/^SE\d/i.test(trimmed)) return DIRTY_WINE_VAT_NUMBER;
  return trimmed;
}
