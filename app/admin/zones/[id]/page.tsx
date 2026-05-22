import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPalletZone } from "@/lib/actions/zones";
import ZoneForm from "@/components/admin/zone-form";
import { DeleteZoneButton } from "@/components/admin/delete-zone-button";
import { notFound } from "next/navigation";

interface EditZonePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditZonePage({ params }: EditZonePageProps) {
  try {
    const { id } = await params;
    const zone = await getPalletZone(id);

    if (zone.zone_type === "delivery") {
      const sb = getSupabaseAdmin();
      const { data: geo } = await sb
        .from("geo_zones")
        .select("id, display_name")
        .eq("default_delivery_zone_id", id)
        .maybeSingle();

      if (geo?.id) {
        redirect(`/admin/geo-zones/${geo.id}`);
      }
      redirect("/admin/geo-zones");
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Redigera upphämtningszon
            </h1>
            <p className="text-gray-600 dark:text-zinc-400">{zone.name}</p>
          </div>
          <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
        </div>

        <ZoneForm zone={zone} pickupOnly />
      </div>
    );
  } catch {
    notFound();
  }
}
