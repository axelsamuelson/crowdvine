"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteZoneButton } from "@/components/admin/delete-zone-button";
import { MapPin, Package, Globe, Filter, Truck } from "lucide-react";
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
  /** When true, list is pickup-only (no delivery type filter). */
  pickupOnly?: boolean;
}

export function ZonesClient({ zones, pickupOnly = false }: ZonesClientProps) {
  const [countryFilter, setCountryFilter] = useState<string>("all");

  const filteredZones = zones.filter((zone) => {
    const matchesCountry =
      countryFilter === "all" || zone.country_code === countryFilter;
    if (pickupOnly) {
      return zone.zone_type === "pickup" && matchesCountry;
    }
    return matchesCountry;
  });

  const uniqueCountries = Array.from(
    new Set(zones.map((z) => z.country_code).filter(Boolean)),
  );

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        {pickupOnly ? "Alla upphämtningszoner" : "Alla pallzoner"}
      </h2>
      {pickupOnly ? (
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
          Leveranszoner skapas och redigeras under{" "}
          <Link href="/admin/geo-zones" className="underline">
            Vinzoner & leverans
          </Link>
          .
        </p>
      ) : null}

      {uniqueCountries.length > 0 ? (
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium">
              Land
            </label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full rounded-lg border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs h-9">
                <SelectValue placeholder="Alla länder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla länder</SelectItem>
                {uniqueCountries.map((country) => (
                  <SelectItem key={country} value={country!}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-gray-600 dark:text-zinc-400 pb-2">
            <span className="font-medium text-gray-900 dark:text-zinc-100">
              {filteredZones.length}
            </span>{" "}
            / {zones.length}
          </div>
          {countryFilter !== "all" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCountryFilter("all")}
              className="text-xs"
            >
              Rensa filter
            </Button>
          ) : null}
        </div>
      ) : null}

      {filteredZones.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {zones.length === 0
            ? "Inga upphämtningszoner ännu."
            : "Inga zoner matchar filtret."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZones.map((zone) => (
            <div
              key={zone.id}
              className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                    {zone.name}
                  </h3>
                </div>
                <span className="text-[11px] text-gray-500 shrink-0">
                  {zone.radius_km} km
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                Upphämtning vid vingård / producent
              </p>
              <div className="space-y-2 text-xs text-gray-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {zone.center_lat.toFixed(4)}, {zone.center_lon.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" />
                  {zone.pickupPallets} pallar ·{" "}
                  {zone.totalCapacity.toLocaleString()} flaskor
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-zinc-800">
                <Button asChild variant="outline" size="sm" className="text-xs h-8">
                  <Link href={`/admin/zones/${zone.id}`}>Redigera</Link>
                </Button>
                <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
