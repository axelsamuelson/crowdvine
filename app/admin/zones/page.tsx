import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Plus, Truck, Globe, Navigation } from "lucide-react";
import { ZonesClient } from "./zones-client";

export default async function PickupZonesPage() {
  const sb = getSupabaseAdmin();

  const { data: zones } = await sb
    .from("pallet_zones")
    .select("*")
    .eq("zone_type", "pickup")
    .order("name");

  const { data: allPallets } = await sb
    .from("pallets")
    .select("id, name, bottle_capacity, pickup_zone_id");

  const zonesWithStats =
    zones?.map((zone) => {
      const pickupPallets =
        allPallets?.filter((p) => p.pickup_zone_id === zone.id) || [];
      return {
        ...zone,
        totalPallets: pickupPallets.length,
        totalCapacity: pickupPallets.reduce(
          (sum, p) => sum + (p.bottle_capacity || 0),
          0,
        ),
        pickupPallets: pickupPallets.length,
        deliveryPallets: 0,
      };
    }) ?? [];

  const totalPickupPallets = zonesWithStats.reduce(
    (sum, z) => sum + z.pickupPallets,
    0,
  );

  const stats = [
    {
      label: "Upphämtningszoner",
      value: String(zonesWithStats.length),
      sub: "Producent / vingård",
      icon: Globe,
      iconBg: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pallar kopplade",
      value: String(totalPickupPallets),
      sub: "Via pickup_zone_id",
      icon: Navigation,
      iconBg: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upphämtningszoner
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1 max-w-xl">
            Var producentens vin hämtas när fraktregion saknas.{" "}
            <Link
              href="/admin/geo-zones"
              className="underline hover:text-gray-900 dark:hover:text-white"
            >
              Vinzoner & leverans
            </Link>{" "}
            hanterar kundens land/stad och leverans — inte här.
          </p>
        </div>
        <Button
          asChild
          className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
        >
          <Link href="/admin/zones/new">
            <Plus className="h-3.5 w-3.5 mr-2" />
            Ny upphämtningszon
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 flex flex-col border border-gray-200 dark:border-[#1F1F23]"
          >
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 w-fit">
              <stat.icon className={`w-4 h-4 ${stat.iconBg}`} />
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
              {stat.value}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <ZonesClient zones={zonesWithStats} pickupOnly />
    </div>
  );
}
