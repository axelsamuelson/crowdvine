import Link from "next/link";
import { getProducers } from "@/lib/actions/producers";
import { extractWineText } from "@/lib/i18n/wine-locale";
import { Button } from "@/components/ui/button";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Wine, Plus, Users } from "lucide-react";
import {
  AdminProducersContent,
  type AdminProducerListItem,
} from "./admin-producers-content";

export default async function ProducersPage() {
  const producersRaw = await getProducers();
  const sb = getSupabaseAdmin();

  const { data: countries } = await sb.from("countries").select("code, name");
  const countryNameByCode: Record<string, string> = {};
  (countries ?? []).forEach((c: { code: string; name: string }) => {
    countryNameByCode[c.code] = c.name;
  });

  const pickupZoneIds = Array.from(
    new Set(
      producersRaw
        .map((p: { pickup_zone_id?: string | null }) => p.pickup_zone_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const pickupZoneNameById: Record<string, string> = {};
  if (pickupZoneIds.length > 0) {
    const { data: zones } = await sb
      .from("pallet_zones")
      .select("id, name")
      .in("id", pickupZoneIds);
    (zones || []).forEach((z: { id: string; name: string }) => {
      pickupZoneNameById[z.id] = z.name;
    });
  }

  const producers: AdminProducerListItem[] = producersRaw.map((p) => ({
    id: p.id,
    name: p.name,
    region: p.region || "",
    country_code: p.country_code || "",
    address_street: p.address_street || "",
    address_city: p.address_city || "",
    address_postcode: p.address_postcode || "",
    short_description:
      extractWineText(
        p.short_description as Record<string, string> | string | null,
        "sv",
      ) ?? "",
    pickup_zone_id: p.pickup_zone_id ?? null,
    is_live: (p as { is_live?: boolean }).is_live,
    contact_email: (p as { contact_email?: string | null }).contact_email ?? null,
    contact_phone: (p as { contact_phone?: string | null }).contact_phone ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Wine className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Producers
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Manage wine producers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/producer-groups">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Producer Groups
            </Button>
          </Link>
          <Link href="/admin/producers/new">
            <Button
              size="sm"
              className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Producer
            </Button>
          </Link>
        </div>
      </div>

      <AdminProducersContent
        producers={producers}
        countryNameByCode={countryNameByCode}
        pickupZoneNameById={pickupZoneNameById}
      />
    </div>
  );
}
