// TODO: confirm 18-year interpretation with Swedish alcohol attorney
// before first B2C order (Alkohollagen 3 kap 8 § — vin, not sprit)
export const AGE_LIMITS: Record<string, number> = {
  SE: 18,
  FI: 18,
  DK: 16,
  DE: 16,
  NL: 18,
  NO: 18,
};

export const DEFAULT_AGE_LIMIT = 18;

export function getAgeLimit(countryCode: string): number {
  return AGE_LIMITS[countryCode.toUpperCase()] ?? DEFAULT_AGE_LIMIT;
}
