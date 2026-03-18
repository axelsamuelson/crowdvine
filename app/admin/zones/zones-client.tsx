"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      {/* Filters + list – one card */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Zones
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600 dark:text-zinc-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">
              Filter
            </span>
          </div>
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium">
                Zone Type
              </label>
              <Select
                value={zoneTypeFilter}
                onValueChange={setZoneTypeFilter}
              >
                <SelectTrigger className="w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 text-xs h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {uniqueCountries.length > 0 && (
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium">
                  Country
                </label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 text-xs h-9">
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
          <div className="text-xs text-gray-600 dark:text-zinc-400">
            <span className="font-medium text-gray-900 dark:text-zinc-100">
              {filteredZones.length}
            </span>{" "}
            / {zones.length} zones
          </div>
          {(zoneTypeFilter !== "all" || countryFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setZoneTypeFilter("all");
                setCountryFilter("all");
              }}
              className="text-xs text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/50 rounded-lg"
            >
              Clear
            </Button>
          )}
        </div>

        {filteredZones.length === 0 && zones.length > 0 ? (
          <div className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl py-12 flex flex-col items-center justify-center">
            <Filter className="h-14 w-14 mx-auto mb-4 text-gray-400 dark:text-zinc-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
              No zones match your filters
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 text-center max-w-sm">
              Try adjusting your filters to see more zones.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setZoneTypeFilter("all");
                setCountryFilter("all");
              }}
              className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => (
              <div
                key={zone.id}
                className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800">
                      <MapPin
                        className={`w-4 h-4 ${
                          zone.zone_type === "pickup"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-purple-600 dark:text-purple-400"
                        }`}
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {zone.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        zone.zone_type === "pickup"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                      }`}
                    >
                      {zone.zone_type}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                      {zone.radius_km} km
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                  {zone.zone_type === "pickup"
                    ? "Wine pickup location"
                    : "Customer delivery area"}
                </p>
                <div className="space-y-2 text-xs text-gray-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {zone.center_lat.toFixed(4)}, {zone.center_lon.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" />
                      {zone.totalPallets} pallets · {zone.totalCapacity.toLocaleString()} bottles
                    </span>
                  </div>
                  {zone.country_code && (
                    <div className="text-[11px]">Country: {zone.country_code}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-zinc-800">
                  <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono">
                    {zone.id.slice(0, 8)}…
                  </span>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs font-medium h-8 border-gray-200 dark:border-zinc-700"
                    >
                      <Link href={`/admin/zones/${zone.id}`}>Edit</Link>
                    </Button>
                    <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
