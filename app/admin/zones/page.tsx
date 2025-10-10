import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Plus,
  Truck,
  Package,
  Globe,
  Navigation,
} from "lucide-react";
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Zone Management</h1>
          <p className="text-gray-600 mt-2">
            Manage pickup and delivery zones for pallet routing
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/zones/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Link>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Zones
                </p>
                <p className="text-3xl font-bold text-blue-600">{totalZones}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Active zones
                </p>
              </div>
              <Globe className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pickup Zones
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {pickupZones.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wine origins
                </p>
              </div>
              <Truck className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Delivery Zones
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {deliveryZones.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer areas
                </p>
              </div>
              <Package className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pallets
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {totalPallets}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all zones
                </p>
              </div>
              <Navigation className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client-side Filtered Zones */}
      <ZonesClient zones={zonesWithStats} />
    </div>
  );
}
