/**
 * v1.2 geo-bot heuristic (CN/SG/HK + behavior).
 * Never flags a whole country — requires direct + short + few events + not engaged.
 */

export const GEO_BOT_COUNTRIES = ["CN", "SG", "HK"] as const;

export type GeoBotSuspectInput = {
  countryCode: string | null | undefined;
  channel: string | null | undefined;
  durationS: number | null | undefined;
  events: number | null | undefined;
  engaged: boolean | null | undefined;
};

export function isGeoBotSuspect(input: GeoBotSuspectInput): boolean {
  const cc = (input.countryCode || "").toUpperCase();
  if (!GEO_BOT_COUNTRIES.includes(cc as (typeof GEO_BOT_COUNTRIES)[number])) {
    return false;
  }
  if ((input.channel || "") !== "direct") return false;
  if ((input.durationS ?? 0) >= 1) return false;
  if ((input.events ?? 0) > 2) return false;
  if (input.engaged === true) return false;
  return true;
}
