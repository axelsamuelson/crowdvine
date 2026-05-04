import { isValidUsStateCode } from "@/lib/countries";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";

/** Row shape from `user_zone_addresses` (subset used at checkout). */
export type UserZoneAddressTemplate = {
  id: string;
  user_id: string;
  geo_zone_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  region_code: string | null;
};

export type ZoneDeliveryLines = {
  street: string;
  city: string;
  postal: string;
  countryCode: string;
  regionCode: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
};

export function userZoneRowToDeliveryLines(
  row: UserZoneAddressTemplate | null,
): ZoneDeliveryLines | null {
  if (!row) return null;
  const street = (row.address_line1 ?? "").trim();
  const city = (row.city ?? "").trim();
  const postal = (row.postal_code ?? "").trim();
  const cc = (row.country_code ?? "").trim().toUpperCase();
  if (!street || !city || !postal || cc.length !== 2) return null;
  const rcRaw = (row.region_code ?? "").trim().toUpperCase();
  const regionCode = rcRaw.length === 2 ? rcRaw : null;
  return {
    street,
    city,
    postal,
    countryCode: cc,
    regionCode,
    fullName: row.full_name?.trim() ? row.full_name.trim() : null,
    phone: row.phone?.trim() ? row.phone.trim() : null,
    email: row.email?.trim() ? row.email.trim() : null,
  };
}

/**
 * Whether saved (or draft) delivery lines are sufficient for checkout / zones,
 * given the active shopping geo slice.
 */
export function isZoneDeliveryCompleteForActiveGeo(
  active: ResolvedActiveGeoZone,
  d: ZoneDeliveryLines | null,
): boolean {
  if (!d) return false;
  if (d.countryCode !== active.countryCode) return false;
  const usConditional =
    active.countryCode === "US" && active.canReserveConditionally === true;
  if (usConditional) {
    return Boolean(d.regionCode && isValidUsStateCode(d.regionCode));
  }
  if (
    active.regionCode &&
    active.regionCode.trim().length === 2 &&
    d.regionCode !== active.regionCode.trim().toUpperCase()
  ) {
    return false;
  }
  return true;
}
