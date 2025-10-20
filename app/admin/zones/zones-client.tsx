"use client";

import { useState } from "react";
import Link from "next/link";
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
import { MapPin, Package, Navigation, Globe, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Zone {
  id: string;
  name: string;
  zone_type: string;
  center_lat: number;
  center_lon: number;
  radius_km: number;
  country_code: string | null;
  totalPallets: number;
  totalCapacity: number;
  pickupPallets: number;
  deliveryPallets: number;
}

interface ZonesClientProps {
  zones: Zone[];
}

export function ZonesClient({ zones }: ZonesClientProps) {
  const [zoneTypeFilter, setZoneTypeFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  // Filter zones based on selections
  const filteredZones = zones.filter((zone) => {
    const matchesType =
      zoneTypeFilter === "all" || zone.zone_type === zoneTypeFilter;
    const matchesCountry =
      countryFilter === "all" || zone.country_code === countryFilter;
    return matchesType && matchesCountry;
  });

  // Get unique countries for filter
  const uniqueCountries = Array.from(
    new Set(zones.map((z) => z.country_code).filter(Boolean)),
  );

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>

            <div className="flex flex-wrap gap-4 flex-1">
              {/* Zone Type Filter */}
              <div className="flex flex-col gap-1.5 min-w-[180px]">
                <label className="text-xs text-gray-600 font-medium">
                  Zone Type
                </label>
                <Select
                  value={zoneTypeFilter}
                  onValueChange={setZoneTypeFilter}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pickup">Pickup Zones</SelectItem>
                    <SelectItem value="delivery">Delivery Zones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Country Filter */}
              {uniqueCountries.length > 0 && (
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <label className="text-xs text-gray-600 font-medium">
                    Country
                  </label>
                  <Select
                    value={countryFilter}
                    onValueChange={setCountryFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map((country) => (
                        <SelectItem key={country} value={country!}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredZones.length}</span> /{" "}
              {zones.length} zones
            </div>

            {/* Clear filters */}
            {(zoneTypeFilter !== "all" || countryFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setZoneTypeFilter("all");
                  setCountryFilter("all");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredZones.map((zone) => (
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
                {zone.country_code && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Country:</span>
                    <span className="font-medium">{zone.country_code}</span>
                  </div>
                )}
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
      {filteredZones.length === 0 && zones.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              No zones match your filters
            </h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Try adjusting your filters to see more zones.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setZoneTypeFilter("all");
                setCountryFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
