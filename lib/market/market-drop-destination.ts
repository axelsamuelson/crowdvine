import {
  getCountryDisplayName,
  isValidUsStateCode,
} from "@/lib/countries";
import type { ResolvedMarket } from "@/lib/market/resolve-market";
import { getUsStateDisplayNameEn } from "@/lib/market/us-state-names-en";

/** e.g. "New York, United States" · "Sweden" (EU country-only for now). */
export function formatMarketSliceDisplayDestination(
  resolved: ResolvedMarket,
): string {
  const cc = resolved.countryCode.trim().toUpperCase();
  if (cc === "US") {
    const st =
      typeof resolved.regionCode === "string"
        ? resolved.regionCode.trim().toUpperCase()
        : "";
    if (st && isValidUsStateCode(st)) {
      const name = getUsStateDisplayNameEn(st) ?? st;
      return `${name}, United States`;
    }
    return "United States";
  }
  return getCountryDisplayName(cc, "en");
}

/** Virtual PDP title from admin `geo_zones.display_name` (e.g. "Stockholm, Sweden"). */
export function formatVirtualDropReadyFromDisplayName(
  displayName: string,
): string {
  const place = displayName.split(",")[0]?.trim() || displayName.trim();
  return `${place} pallet · Ready to start`;
}

/** First line for virtual PDP: "New York pallet · Ready to start". */
export function formatVirtualDropReadyStatusPrimary(
  resolved: ResolvedMarket,
): string {
  const cc = resolved.countryCode.trim().toUpperCase();
  if (cc === "US") {
    const st =
      typeof resolved.regionCode === "string"
        ? resolved.regionCode.trim().toUpperCase()
        : "";
    if (st && isValidUsStateCode(st)) {
      const name = getUsStateDisplayNameEn(st) ?? st;
      return `${name} pallet · Ready to start`;
    }
  }
  const place = getCountryDisplayName(cc, "en");
  return `${place} pallet · Ready to start`;
}
