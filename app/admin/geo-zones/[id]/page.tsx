import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import GeoZoneForm, {
  type GeoZoneFormValues,
  type LinkedDeliveryZone,
} from "@/components/admin/geo-zone-form";
import { DeleteGeoZoneButton } from "@/components/admin/delete-geo-zone-button";

export default async function EditGeoZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("geo_zones")
    .select(
      `
      id, market_code, country_code, region_code, city, name, display_name,
      zone_type, eligibility_status, currency_code, is_active, sort_order,
      default_delivery_zone_id,
      delivery_zone:pallet_zones!geo_zones_default_delivery_zone_id_fkey (
        id, name, radius_km, center_lat, center_lon
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const row = data as GeoZoneFormValues & {
    delivery_zone?: LinkedDeliveryZone | LinkedDeliveryZone[] | null;
  };
  const raw = row.delivery_zone;
  const linkedDelivery = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/geo-zones"
            className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
          >
            ← Vinzoner & leverans
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            Redigera zon
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {row.display_name} · {row.country_code}
            {row.city ? ` · ${row.city}` : ""}
          </p>
        </div>
        <DeleteGeoZoneButton
          zoneId={row.id}
          zoneName={row.display_name}
          hasLinkedDelivery={linkedDelivery != null}
        />
      </div>
      <GeoZoneForm zone={row} linkedDelivery={linkedDelivery} />
    </div>
  );
}
