import { getCountryDisplayName } from "@/lib/countries";
import { geocodeFromFields } from "@/lib/geocoding";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_DELIVERY_RADIUS_KM = 150;

export function geoZoneCityRequired(
  city: string | null | undefined,
): string | null {
  const c = (city ?? "").trim();
  if (!c) return "Wine zone must include a city (stad).";
  return null;
}

type SyncInput = {
  geoZoneId: string;
  displayName: string;
  countryCode: string;
  city: string;
  existingDeliveryZoneId?: string | null;
};

/**
 * Creates or updates a delivery pallet_zone sharing {@link SyncInput.displayName}
 * as zone name, then returns its id for geo_zones.default_delivery_zone_id.
 */
export async function syncDeliveryZoneForGeoZone(
  input: SyncInput,
): Promise<string> {
  const cityErr = geoZoneCityRequired(input.city);
  if (cityErr) throw new Error(cityErr);

  const sb = getSupabaseAdmin();
  const name = input.displayName.trim();
  const city = input.city.trim();
  const cc = input.countryCode.trim().toUpperCase();
  if (name.length < 2 || cc.length !== 2) {
    throw new Error("display_name and country_code are required for delivery sync");
  }

  let centerLat = 59.3293;
  let centerLon = 18.0686;
  const geo = await geocodeFromFields({
    street: "",
    postcode: "",
    city,
    country: getCountryDisplayName(cc, "en"),
  });
  if (!("error" in geo)) {
    centerLat = geo.lat;
    centerLon = geo.lon;
  }

  const basePayload: Record<string, unknown> = {
    name,
    zone_type: "delivery",
    center_lat: centerLat,
    center_lon: centerLon,
    radius_km: DEFAULT_DELIVERY_RADIUS_KM,
  };

  const withCountry = { ...basePayload, country_code: cc };

  const tryUpdate = async (id: string) => {
    let { error } = await sb.from("pallet_zones").update(withCountry).eq("id", id);
    if (error?.message?.includes("country_code")) {
      ({ error } = await sb.from("pallet_zones").update(basePayload).eq("id", id));
    }
    if (error) throw new Error(error.message);
    return id;
  };

  const tryInsert = async () => {
    let { data, error } = await sb
      .from("pallet_zones")
      .insert(withCountry)
      .select("id")
      .single();
    if (error?.message?.includes("country_code")) {
      ({ data, error } = await sb
        .from("pallet_zones")
        .insert(basePayload)
        .select("id")
        .single());
    }
    if (error || !data) throw new Error(error?.message ?? "Failed to create delivery zone");
    return (data as { id: string }).id;
  };

  const existingId = input.existingDeliveryZoneId?.trim();
  if (existingId) {
    const linked = await tryUpdate(existingId);
    await sb
      .from("geo_zones")
      .update({
        default_delivery_zone_id: linked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.geoZoneId);
    return linked;
  }

  const { data: byName } = await sb
    .from("pallet_zones")
    .select("id")
    .eq("zone_type", "delivery")
    .eq("name", name)
    .maybeSingle();

  if (byName?.id) {
    const linked = await tryUpdate(byName.id as string);
    await sb
      .from("geo_zones")
      .update({
        default_delivery_zone_id: linked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.geoZoneId);
    return linked;
  }

  const newId = await tryInsert();

  await sb
    .from("geo_zones")
    .update({
      default_delivery_zone_id: newId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.geoZoneId);

  return newId;
}
