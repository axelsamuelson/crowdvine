/** Organisationsnummer på fakturaavsändaren. Samma värde som invoice_sender_defaults. */
export const DIRTY_WINE_ORG_NUMBER = "940402-5133";

/** Momsregistreringsnummer. Samma värde som invoice_sender_defaults. */
export const DIRTY_WINE_VAT_NUMBER = "SE940402513301";

/** Punktskattenummer. Samma värde som invoice_sender_defaults.excise_number. */
export const DIRTY_WINE_EXCISE_NUMBER = "SEM9404025133";

/** Use stored org number when it looks valid; otherwise fall back to the sender row. */
export function resolveCompanyOrgNumber(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || !/\d/.test(trimmed)) return DIRTY_WINE_ORG_NUMBER;
  return trimmed;
}

/** Use stored VAT number when it looks valid; otherwise fall back to the sender row. */
export function resolveCompanyVatNumber(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || !/^SE\d/i.test(trimmed)) return DIRTY_WINE_VAT_NUMBER;
  return trimmed;
}

/** Use a stored punktskattenummer when one is set; otherwise fall back to the sender row. */
export function resolveCompanyExciseNumber(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return DIRTY_WINE_EXCISE_NUMBER;
  return trimmed;
}
