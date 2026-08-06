/**
 * Minimum age for alcohol distance selling / retail reservation.
 * SE: 20 — GC confirmed (retail/distance selling). 18 is on-premise only.
 */
export const AGE_LIMITS: Record<string, number> = {
  SE: 20,
  FI: 18,
  DK: 16,
  DE: 16,
  NL: 18,
  NO: 18,
};

export const DEFAULT_AGE_LIMIT = 20;

export function getAgeLimit(countryCode: string): number {
  return AGE_LIMITS[countryCode.toUpperCase()] ?? DEFAULT_AGE_LIMIT;
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
