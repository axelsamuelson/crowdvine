/**
 * PACT customer-site footer company disclosure (legal-mandated wording).
 * Character-for-character — do not paraphrase.
 */

export const PACT_FOOTER_COMPANY_EMAIL = "customer@pactwines.com" as const;

export const PACT_FOOTER_COMPANY_SEP = " · " as const;

/** Non-email segments before the mailto, in display order. */
export const PACT_FOOTER_COMPANY_SEGMENTS = {
  sv: [
    "EURPACT OÜ",
    "Tartu mnt 67/1-13b, 10115 Tallinn, Estland",
    "Reg.nr 17538270",
  ],
  en: [
    "EURPACT OÜ",
    "Tartu mnt 67/1-13b, 10115 Tallinn, Estonia",
    "Reg. no. 17538270",
  ],
} as const;

export type PactFooterCompanyLocale = keyof typeof PACT_FOOTER_COMPANY_SEGMENTS;

/** Full plain-text line including the email (for tests / a11y). */
export function pactFooterCompanyPlain(
  locale: PactFooterCompanyLocale,
): string {
  return [
    ...PACT_FOOTER_COMPANY_SEGMENTS[locale],
    PACT_FOOTER_COMPANY_EMAIL,
  ].join(PACT_FOOTER_COMPANY_SEP);
}
