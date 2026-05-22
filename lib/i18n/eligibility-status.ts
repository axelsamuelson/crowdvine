/** Map geo_zones eligibility_status → message key. */
export function eligibilityStatusMessageKey(status: string): string {
  const s = status.trim().toLowerCase().replace(/-/g, "_");
  if (s === "normal_checkout") return "zone.eligibilityNormal";
  if (s === "conditional_reservation") return "zone.eligibilityConditional";
  if (s === "interest_only") return "zone.eligibilityInterest";
  return "zone.eligibilityInterest";
}
