import type { DeliveryAddress } from "@/lib/zone-matching";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Server-only env: optional explicit UUID for Stockholm default delivery zone
 * (avoids embedding IDs in source; set per environment if needed).
 */
export const ENV_DEFAULT_STOCKHOLM_DELIVERY_ZONE_ID =
  "DEFAULT_STOCKHOLM_DELIVERY_ZONE_ID" as const;

/**
 * Seeded name from docs/archives/migrations/create-zones-sql.sql
 * ("Stockholm Delivery Zone").
 */
export const STOCKHOLM_DELIVERY_ZONE_NAME_SUBSTRING = "Stockholm" as const;

/**
 * Address that geocodes inside the standard Stockholm delivery zone when
 * {@link determineZones} runs (used as fallback when profile has no zone).
 */
export const STOCKHOLM_FALLBACK_GEO_ADDRESS: DeliveryAddress = {
  postcode: "111 22",
  city: "Stockholm",
  countryCode: "SE",
};

/**
 * Resolve Stockholm default delivery zone id from env or pallet_zones lookup.
 * Never hardcodes a UUID in source.
 */
export async function resolveDefaultStockholmDeliveryZoneId(): Promise<
  string | null
> {
  const fromEnv = process.env[ENV_DEFAULT_STOCKHOLM_DELIVERY_ZONE_ID]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("pallet_zones")
    .select("id")
    .eq("zone_type", "delivery")
    .ilike("name", `%${STOCKHOLM_DELIVERY_ZONE_NAME_SUBSTRING}%`)
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }
  return data.id;
}
