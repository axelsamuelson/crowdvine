import { isUiLocalizationEnabled } from "@/lib/localization";

/**
 * Central checkout / delivery country rules (ISO 3166-1 alpha-2).
 * Unknown countries must never fall back to SE — use null and block checkout.
 *
 * Market modes:
 * - normal_checkout: EU countries where we run standard reservation + charge flows
 * - conditional_reservation: US — card verification (SetupIntent) only; charge after approval
 * - unsupported: everything else (browse may still be allowed elsewhere)
 */

export const SUPPORTED_CHECKOUT_COUNTRY_CODES = [
  "SE",
  "NO",
  "DK",
  "FI",
  "DE",
  "FR",
  "GB",
] as const;

export type SupportedCheckoutCountryCode =
  (typeof SUPPORTED_CHECKOUT_COUNTRY_CODES)[number];

export const SUPPORTED_PROFILE_COUNTRY_CODES = [
  ...SUPPORTED_CHECKOUT_COUNTRY_CODES,
  "US",
] as const;

export type SupportedProfileCountryCode =
  (typeof SUPPORTED_PROFILE_COUNTRY_CODES)[number];

const CHECKOUT_SUPPORT_SET = new Set<string>(SUPPORTED_CHECKOUT_COUNTRY_CODES);
const PROFILE_SUPPORT_SET = new Set<string>(SUPPORTED_PROFILE_COUNTRY_CODES);

/** US two-letter state / territory codes used for conditional reservation. */
export const US_STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "AS",
  "GU",
  "MP",
  "PR",
  "VI",
]);

export function isValidUsStateCode(code: string | null | undefined): boolean {
  if (code == null) return false;
  const u = String(code).trim().toUpperCase();
  return u.length === 2 && US_STATE_CODES.has(u);
}

/** Two-letter codes sorted for UI selects. */
export function listUsStateCodesSorted(): string[] {
  return [...US_STATE_CODES].sort((a, b) => a.localeCompare(b));
}

export type CountryMarketMode =
  | "normal_checkout"
  | "conditional_reservation"
  | "unsupported";

export function getCountryMarketMode(
  countryCode: string | null | undefined,
): CountryMarketMode {
  if (!countryCode?.trim()) return "unsupported";
  const c = countryCode.trim().toUpperCase();
  if (c === "US") return "conditional_reservation";
  if (CHECKOUT_SUPPORT_SET.has(c)) return "normal_checkout";
  return "unsupported";
}

export function isSupportedProfileCountry(countryCode: string): boolean {
  if (!countryCode?.trim()) return false;
  return PROFILE_SUPPORT_SET.has(countryCode.trim().toUpperCase());
}

export function isSupportedCheckoutCountry(countryCode: string): boolean {
  if (!countryCode?.trim()) return false;
  return CHECKOUT_SUPPORT_SET.has(countryCode.trim().toUpperCase());
}

export function isConditionalReservationCountry(countryCode: string): boolean {
  return getCountryMarketMode(countryCode) === "conditional_reservation";
}

/** Legacy profile labels and common aliases → ISO code (profile/browsing countries). */
const PROFILE_ALIAS_TO_CODE: Record<string, SupportedProfileCountryCode> = {
  sweden: "SE",
  sverige: "SE",
  norway: "NO",
  norge: "NO",
  denmark: "DK",
  danmark: "DK",
  finland: "FI",
  suomi: "FI",
  germany: "DE",
  deutschland: "DE",
  france: "FR",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  "united states": "US",
  usa: "US",
  us: "US",
  america: "US",
};

const DISPLAY_EN: Record<SupportedProfileCountryCode, string> = {
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  DE: "Germany",
  FR: "France",
  GB: "United Kingdom",
  US: "United States",
};

const DISPLAY_SV: Record<SupportedCheckoutCountryCode, string> = {
  SE: "Sverige",
  NO: "Norge",
  DK: "Danmark",
  FI: "Finland",
  DE: "Tyskland",
  FR: "Frankrike",
  GB: "Storbritannien",
};

/** Server and Stripe return paths — single sentence, English. */
export const CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE =
  "We do not currently support reservations for your country.";

/** Checkout UI — explain browse vs reserve (shown together EN + SV). */
export const CHECKOUT_BROWSE_ONLY_UNSUPPORTED_COUNTRY_EN =
  "PACT is not yet available for reservations in your country. You can still browse wines, but checkout is currently limited to supported delivery countries.";

export const CHECKOUT_BROWSE_ONLY_UNSUPPORTED_COUNTRY_SV =
  "PACT är ännu inte tillgängligt för reservationer i ditt land. Du kan fortfarande utforska viner, men checkout är för närvarande begränsad till länder vi kan leverera till.";

/** US conditional reservation — long copy (EN). */
export const US_CONDITIONAL_RESERVATION_COPY_EN =
  "PACT is not yet fully available for checkout in the United States. You can place a conditional reservation and verify your card, but you will not be charged now. We will only charge you if this drop becomes available in your state and all legal, shipping, and compliance requirements are satisfied.";

export const US_CONDITIONAL_RESERVATION_BUTTON_EN =
  "Place conditional reservation";

export const US_CONDITIONAL_TERMS_VERSION = "US_CONDITIONAL_RESERVATION_v1";

export const US_CHARGE_BLOCKED_REASON = "US_LEGAL_LOGISTICS_REVIEW_REQUIRED";

export function getCheckoutBrowseOnlyUnsupportedCountryMessage(
  host?: string | null,
  searchParams?: { get: (key: string) => string | null } | null,
): string {
  if (host != null && !isUiLocalizationEnabled(host, searchParams)) {
    return CHECKOUT_BROWSE_ONLY_UNSUPPORTED_COUNTRY_EN;
  }
  return `${CHECKOUT_BROWSE_ONLY_UNSUPPORTED_COUNTRY_EN}\n\n${CHECKOUT_BROWSE_ONLY_UNSUPPORTED_COUNTRY_SV}`;
}

/**
 * Normalize free text or ISO-2 to a supported checkout (EU) country code, or null.
 * Does not default to SE. US is not a normal checkout country.
 */
export function normalizeCountry(input: string): string | null {
  const t = (input ?? "").trim();
  if (!t) return null;
  if (/^[a-zA-Z]{2}$/.test(t)) {
    const u = t.toUpperCase();
    return CHECKOUT_SUPPORT_SET.has(u)
      ? (u as SupportedCheckoutCountryCode)
      : null;
  }
  const fromAlias = PROFILE_ALIAS_TO_CODE[t.toLowerCase()];
  if (fromAlias && CHECKOUT_SUPPORT_SET.has(fromAlias)) return fromAlias;
  return null;
}

/**
 * Normalize profile/stored country to ISO-2 for supported profile countries (EU + US), or null.
 */
export function normalizeProfileCountry(input: string): string | null {
  const t = (input ?? "").trim();
  if (!t) return null;
  if (/^[a-zA-Z]{2}$/.test(t)) {
    const u = t.toUpperCase();
    return PROFILE_SUPPORT_SET.has(u)
      ? (u as SupportedProfileCountryCode)
      : null;
  }
  const fromAlias = PROFILE_ALIAS_TO_CODE[t.toLowerCase()];
  return fromAlias ?? null;
}

/** Profile `country` may store ISO code (preferred) or legacy English name. */
export function getCountryCodeFromProfileCountry(
  input: string | null,
): string | null {
  if (input == null) return null;
  return normalizeProfileCountry(String(input));
}

export function getSupportedCheckoutCountries(): Array<{
  code: SupportedCheckoutCountryCode;
  nameEn: string;
  nameSv: string;
}> {
  return SUPPORTED_CHECKOUT_COUNTRY_CODES.map((code) => ({
    code,
    nameEn: DISPLAY_EN[code],
    nameSv: DISPLAY_SV[code],
  }));
}

/** Profile editor: EU checkout countries + US (browsing / conditional reservation). */
export function getSupportedProfileCountries(): Array<{
  code: SupportedProfileCountryCode;
  nameEn: string;
}> {
  return SUPPORTED_PROFILE_COUNTRY_CODES.map((code) => ({
    code,
    nameEn: DISPLAY_EN[code],
  }));
}

export function getCountryDisplayName(
  countryCode: string,
  locale: "en" | "sv" = "en",
): string {
  const c = countryCode.trim().toUpperCase();
  if (!PROFILE_SUPPORT_SET.has(c)) return countryCode.trim();
  const code = c as SupportedProfileCountryCode;
  if (locale === "sv") {
    if (code === "US") return "USA";
    const eu = code as SupportedCheckoutCountryCode;
    return DISPLAY_SV[eu];
  }
  return DISPLAY_EN[code];
}
