import type { ResolvedGeoZone } from "@/lib/market/resolve-geo-zone";
import type { ResolvedMarket } from "@/lib/market/resolve-market";

/**
 * Virtual campaign on PDP / interest flows: requires an active geo_zones row that allows
 * starting a campaign (interest_only, conditional_reservation, or normal_checkout).
 * `market_countries` / {@link ResolvedMarket} still gates broad country access.
 */
export function isVirtualCampaignFromGeoZone(
  resolved: ResolvedMarket,
  geo: ResolvedGeoZone | null,
): boolean {
  if (resolved.marketCode === "UNKNOWN" || resolved.countryRole === "blocked") {
    return false;
  }
  if (!geo || !geo.isActive) return false;
  if (geo.eligibilityStatus === "disabled") return false;
  return geo.canStartCampaign;
}
