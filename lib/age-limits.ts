/**
 * Country-level alcohol age floors used when `markets.age_minimum` is missing.
 * SE: 20 — GC confirmed (retail/distance selling). 18 is on-premise only.
 * US: 21 — federal/state retail purchase age.
 */
export const AGE_LIMITS: Record<string, number> = {
  SE: 20,
  US: 21,
  FI: 18,
  DK: 16,
  DE: 16,
  NL: 18,
  NO: 18,
};

/**
 * Safe fallback when neither `markets.age_minimum` nor a known country code
 * applies. Uses the **stricter** (highest) value among {@link AGE_LIMITS}
 * so an unknown market never under-enforces a known jurisdiction.
 */
export const DEFAULT_AGE_LIMIT: number = Math.max(
  ...Object.values(AGE_LIMITS),
);

export function getAgeLimit(countryCode: string): number {
  const key = countryCode.trim().toUpperCase();
  if (!key) return DEFAULT_AGE_LIMIT;
  return AGE_LIMITS[key] ?? DEFAULT_AGE_LIMIT;
}

/**
 * Required age for the active market (client + server).
 *
 * Resolution order:
 * 1. `markets.age_minimum` when it is a finite number > 0 (wins).
 * 2. Else {@link getAgeLimit} for the country (e.g. SE→20, US→21).
 * 3. Unknown / empty country → {@link DEFAULT_AGE_LIMIT} (stricter of known
 *    values; currently 21).
 */
export function resolveMarketAgeMinimum(input: {
  countryCode: string;
  ageMinimum?: number | null;
}): number {
  const fromMarket = input.ageMinimum;
  if (
    typeof fromMarket === "number" &&
    Number.isFinite(fromMarket) &&
    fromMarket > 0
  ) {
    return Math.floor(fromMarket);
  }
  return getAgeLimit(input.countryCode);
}

/** Whole years of age on `asOf` (UTC calendar date). Invalid DOB → null. */
export function ageFromDateOfBirth(
  dobIso: string,
  asOf: Date = new Date(),
): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobIso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (
    born.getUTCFullYear() !== y ||
    born.getUTCMonth() !== mo - 1 ||
    born.getUTCDate() !== d
  ) {
    return null;
  }
  const asOfUtc = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  let age = asOfUtc.getUTCFullYear() - y;
  const hadBirthday =
    asOfUtc.getUTCMonth() > mo - 1 ||
    (asOfUtc.getUTCMonth() === mo - 1 && asOfUtc.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

export function meetsAgeRequirement(
  dobIso: string,
  requiredAge: number,
  asOf: Date = new Date(),
): boolean {
  const age = ageFromDateOfBirth(dobIso, asOf);
  return age != null && age >= requiredAge;
}
