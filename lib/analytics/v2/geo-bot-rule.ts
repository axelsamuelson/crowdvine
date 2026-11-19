/**
 * Saga geo-bot heuristic (CN/SG/HK + behavior).
 * Never flags a whole country — requires direct + no referrer + short + ≤1 PV
 * + no meaningful engagement (filter_used does NOT count).
 */

export const GEO_BOT_COUNTRIES = ["CN", "SG", "HK"] as const;

export type GeoBotSuspectInput = {
  countryCode: string | null | undefined;
  channel: string | null | undefined;
  /** True when session has a non-empty referrer / referrer_domain. */
  hasReferrer: boolean | null | undefined;
  pageViews: number | null | undefined;
  durationS: number | null | undefined;
  /**
   * True when session has session_engaged, add_to_cart, cart_opened,
   * search_submitted, or any checkout event. filter_used alone is false.
   */
  hasGeoEngagement: boolean | null | undefined;
};

export function isGeoBotSuspect(input: GeoBotSuspectInput): boolean {
  const cc = (input.countryCode || "").toUpperCase();
  if (!GEO_BOT_COUNTRIES.includes(cc as (typeof GEO_BOT_COUNTRIES)[number])) {
    return false;
  }
  if ((input.channel || "") !== "direct") return false;
  if (input.hasReferrer === true) return false;
  if ((input.pageViews ?? 0) > 1) return false;
  if ((input.durationS ?? 0) >= 10) return false;
  if (input.hasGeoEngagement === true) return false;
  return true;
}
