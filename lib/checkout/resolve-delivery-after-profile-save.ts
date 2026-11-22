import { normalizePostalDraft } from "@/lib/analytics/checkout-draft-metadata";
import {
  userZoneRowToDeliveryLines,
  type UserZoneAddressTemplate,
  type ZoneDeliveryLines,
} from "@/lib/checkout/user-zone-delivery-template";

/**
 * Map profile / modal address fields into checkout delivery lines.
 * Normalizes Swedish-style spaced postcodes ("981 31" → "98131").
 */
export function profileAddressToDeliveryLines(input: {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  countryCode: string;
  region?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
}): ZoneDeliveryLines | null {
  const street = (input.address ?? "").trim();
  const city = (input.city ?? "").trim();
  const postal = normalizePostalDraft(input.postal_code);
  const countryCode = (input.countryCode ?? "").trim().toUpperCase();
  if (!street || !city || !postal || countryCode.length !== 2) return null;
  const rcRaw = (input.region ?? "").trim().toUpperCase();
  return {
    street,
    city,
    postal,
    countryCode,
    regionCode: rcRaw.length === 2 ? rcRaw : null,
    fullName: (input.full_name ?? "").trim() || null,
    phone: (input.phone ?? "").trim() || null,
    email: (input.email ?? "").trim() || null,
  };
}

function deliveryLocationKey(d: ZoneDeliveryLines): string {
  return [
    d.street.trim().toLowerCase(),
    d.city.trim().toLowerCase(),
    normalizePostalDraft(d.postal),
    d.countryCode.trim().toUpperCase(),
    (d.regionCode ?? "").trim().toUpperCase(),
  ].join("|");
}

function applyLinesToZoneRow(
  row: UserZoneAddressTemplate,
  lines: ZoneDeliveryLines,
): UserZoneAddressTemplate {
  return {
    ...row,
    full_name: lines.fullName,
    phone: lines.phone,
    email: lines.email,
    address_line1: lines.street,
    city: lines.city,
    postal_code: lines.postal,
    country_code: lines.countryCode,
    region_code: lines.regionCode,
  };
}

/**
 * Checkout prefers `user_zone_addresses` over `deliveryDraft` for display.
 * ProfileInfoModal saves to `profiles` only — without aligning the zone row,
 * a stale Stockholm template keeps winning after "Sparat." (and after reload).
 *
 * Returns local state to apply immediately, plus whether the zone template
 * must be PATCHed so the new postal/address survives reload.
 */
export function resolveDeliveryAfterProfileSave(args: {
  zoneAddressRow: UserZoneAddressTemplate | null;
  savedLines: ZoneDeliveryLines;
}): {
  nextZoneAddressRow: UserZoneAddressTemplate | null;
  nextDeliveryDraft: ZoneDeliveryLines | null;
  needsZoneAddressPersist: boolean;
} {
  const { zoneAddressRow, savedLines } = args;
  if (!zoneAddressRow || !userZoneRowToDeliveryLines(zoneAddressRow)) {
    return {
      nextZoneAddressRow: null,
      nextDeliveryDraft: savedLines,
      needsZoneAddressPersist: false,
    };
  }

  const fromZone = userZoneRowToDeliveryLines(zoneAddressRow)!;
  const locationChanged =
    deliveryLocationKey(fromZone) !== deliveryLocationKey(savedLines);
  const contactChanged =
    (zoneAddressRow.full_name ?? null) !== savedLines.fullName ||
    (zoneAddressRow.phone ?? null) !== savedLines.phone ||
    (zoneAddressRow.email ?? null) !== savedLines.email;

  return {
    nextZoneAddressRow: applyLinesToZoneRow(zoneAddressRow, savedLines),
    // Zone row remains source of truth once aligned with the save.
    nextDeliveryDraft: null,
    needsZoneAddressPersist: locationChanged || contactChanged,
  };
}

/** Same precedence as checkout UI: zone template first, else draft. */
export function resolveEffectiveCheckoutDelivery(
  zoneAddressRow: UserZoneAddressTemplate | null,
  deliveryDraft: ZoneDeliveryLines | null,
): ZoneDeliveryLines | null {
  return userZoneRowToDeliveryLines(zoneAddressRow) ?? deliveryDraft;
}
