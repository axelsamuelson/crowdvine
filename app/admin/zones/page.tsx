import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteZoneButton } from "@/components/admin/delete-zone-button";
import {
  MapPin,
  Plus,
  Truck,
  Package,
  Users,
  TrendingUp,
  Globe,
  Navigation,
} from "lucide-react";

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

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zonesWithStats.map((zone) => (
          <Card
            key={zone.id}
            className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin
                    className={`h-5 w-5 ${
                      zone.zone_type === "pickup"
                        ? "text-green-600"
                        : "text-purple-600"
                    }`}
                  />
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      zone.zone_type === "pickup" ? "default" : "secondary"
                    }
                  >
                    {zone.zone_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {zone.radius_km} km
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {zone.zone_type === "pickup"
                  ? "Wine pickup location"
                  : "Customer delivery area"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Location Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Center:</span>
                  <span className="font-medium">
                    {zone.center_lat.toFixed(4)}, {zone.center_lon.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Radius:</span>
                  <span className="font-medium">
                    {zone.radius_km} kilometers
                  </span>
                </div>
              </div>

              {/* Pallet Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-orange-600" />
                  Pallet Statistics
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted p-2 rounded">
                    <div className="text-muted-foreground">Total Pallets</div>
                    <div className="font-medium">{zone.totalPallets}</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <div className="text-muted-foreground">Capacity</div>
                    <div className="font-medium">
                      {zone.totalCapacity.toLocaleString()} bottles
                    </div>
                  </div>
                </div>
                {zone.zone_type === "pickup" && zone.pickupPallets > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {zone.pickupPallets} pickup pallets
                  </div>
                )}
                {zone.zone_type === "delivery" && zone.deliveryPallets > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {zone.deliveryPallets} delivery pallets
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  ID: {zone.id.slice(0, 8)}...
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/zones/${zone.id}`}>Edit</Link>
                  </Button>
                  <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {zonesWithStats.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No zones found</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Create pickup and delivery zones to enable pallet routing and
              customer delivery areas.
            </p>
            <Button asChild>
              <Link href="/admin/zones/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Zone
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
