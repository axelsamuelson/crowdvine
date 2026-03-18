import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import { Plus, Truck, Package, Globe, Navigation } from "lucide-react";
import { ZonesClient } from "./zones-client";

export default async function ZonesPage() {
  const sb = getSupabaseAdmin();

  // Hämta zones med relaterad data
  const { data: zones } = await sb
    .from("pallet_zones")
    .select("*")
    .order("name");

  // Hämta pallets separat för att beräkna statistik
  const { data: allPallets } = await sb
    .from("pallets")
    .select("id, name, bottle_capacity, pickup_zone_id, delivery_zone_id");

  // Beräkna statistik
  const totalZones = zones?.length || 0;
  const pickupZones = zones?.filter((z) => z.zone_type === "pickup") || [];
  const deliveryZones = zones?.filter((z) => z.zone_type === "delivery") || [];

  // Beräkna pallet-statistik per zone
  const zonesWithStats =
    zones?.map((zone) => {
      const pickupPallets =
        allPallets?.filter((p) => p.pickup_zone_id === zone.id) || [];
      const deliveryPallets =
        allPallets?.filter((p) => p.delivery_zone_id === zone.id) || [];
      const totalPallets = pickupPallets.length + deliveryPallets.length;
      const totalCapacity = [...pickupPallets, ...deliveryPallets].reduce(
        (sum, p) => sum + (p.bottle_capacity || 0),
        0,
      );

      return {
        ...zone,
        totalPallets,
        totalCapacity,
        pickupPallets: pickupPallets.length,
        deliveryPallets: deliveryPallets.length,
      };
    }) || [];

  const totalPallets = zonesWithStats.reduce(
    (sum, z) => sum + z.totalPallets,
    0,
  );
  const totalCapacity = zonesWithStats.reduce(
    (sum, z) => sum + z.totalCapacity,
    0,
  );

  const stats = [
    {
      label: "Total Zones",
      value: String(totalZones),
      sub: "Active zones",
      icon: Globe,
      iconBg: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pickup Zones",
      value: String(pickupZones.length),
      sub: "Wine origins",
      icon: Truck,
      iconBg: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Delivery Zones",
      value: String(deliveryZones.length),
      sub: "Customer areas",
      icon: Package,
      iconBg: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Total Pallets",
      value: String(totalPallets),
      sub: "Across all zones",
      icon: Navigation,
      iconBg: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Zone Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
            Manage pickup and delivery zones for pallet routing
          </p>
        </div>
        <Button
          asChild
          className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
        >
          <Link href="/admin/zones/new">
            <Plus className="h-3.5 w-3.5 mr-2" />
            Add Zone
          </Link>
        </Button>
      </div>

      {/* Summary Stats – dashboard card style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 flex flex-col border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
                <stat.icon className={`w-4 h-4 ${stat.iconBg}`} />
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50 mt-0.5">
              {stat.value}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Client-side Filtered Zones */}
      <ZonesClient zones={zonesWithStats} />
    </div>
  );
}
