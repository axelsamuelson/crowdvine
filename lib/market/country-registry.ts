/**
 * Ship-to country register.
 * Rows match migration 315. A code that is not seeded is waitlist, age 18, EUR.
 * Unknown countries are never Sweden and never live checkout.
 */

export type CountryStatus = "live" | "waitlist" | "blocked";

export type CountryPolicy = {
  countryCode: string;
  status: CountryStatus;
  ageMinimum: number;
  displayCurrency: string;
  notes: string | null;
};

export const UNKNOWN_COUNTRY_CODE = "XX";

const UNKNOWN_POLICY: Omit<CountryPolicy, "countryCode"> = {
  status: "waitlist",
  ageMinimum: 18,
  displayCurrency: "EUR",
  notes: null,
};

export const SEEDED_COUNTRIES: readonly CountryPolicy[] = [
  { countryCode: "SE", status: "live", ageMinimum: 20, displayCurrency: "SEK", notes: "Only live checkout market in this phase" },
  { countryCode: "US", status: "waitlist", ageMinimum: 21, displayCurrency: "USD", notes: "conditional_reservation remains in code but is unreachable" },
  { countryCode: "GB", status: "waitlist", ageMinimum: 18, displayCurrency: "GBP", notes: null },
  { countryCode: "CA", status: "waitlist", ageMinimum: 19, displayCurrency: "CAD", notes: null },
  { countryCode: "AU", status: "waitlist", ageMinimum: 18, displayCurrency: "AUD", notes: null },
  { countryCode: "NO", status: "waitlist", ageMinimum: 18, displayCurrency: "NOK", notes: null },
  { countryCode: "DE", status: "waitlist", ageMinimum: 18, displayCurrency: "EUR", notes: null },
  { countryCode: "FR", status: "waitlist", ageMinimum: 18, displayCurrency: "EUR", notes: null },
  { countryCode: "ES", status: "waitlist", ageMinimum: 18, displayCurrency: "EUR", notes: null },
  { countryCode: "NL", status: "waitlist", ageMinimum: 18, displayCurrency: "EUR", notes: null },
] as const;

const BY_CODE = new Map(
  SEEDED_COUNTRIES.map((row) => [row.countryCode, row]),
);

export function normalizeCountryCode(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

/** Policy for a ship-to code. Missing and XX are waitlist, never Sweden. */
export function countryPolicy(
  value: string | null | undefined,
): CountryPolicy {
  const code = normalizeCountryCode(value) ?? UNKNOWN_COUNTRY_CODE;
  const seeded = BY_CODE.get(code);
  if (seeded) return seeded;
  return { countryCode: code, ...UNKNOWN_POLICY };
}

export function shipToCanCheckout(value: string | null | undefined): boolean {
  return countryPolicy(value).status === "live";
}

const COUNTRY_LABELS: Record<string, { sv: string; en: string }> = {
  SE: { sv: "Sverige", en: "Sweden" },
  US: { sv: "USA", en: "the United States" },
  GB: { sv: "Storbritannien", en: "the United Kingdom" },
  CA: { sv: "Kanada", en: "Canada" },
  AU: { sv: "Australien", en: "Australia" },
  NO: { sv: "Norge", en: "Norway" },
  DE: { sv: "Tyskland", en: "Germany" },
  FR: { sv: "Frankrike", en: "France" },
  ES: { sv: "Spanien", en: "Spain" },
  NL: { sv: "Nederländerna", en: "the Netherlands" },
  XX: { sv: "ditt land", en: "your country" },
};

export function countryLabel(
  value: string | null | undefined,
  locale: "sv" | "en",
): string {
  const code = normalizeCountryCode(value) ?? UNKNOWN_COUNTRY_CODE;
  const row = COUNTRY_LABELS[code];
  if (row) return row[locale];
  return code;
}
