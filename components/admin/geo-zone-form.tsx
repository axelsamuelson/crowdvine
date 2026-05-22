"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GeoZoneFormValues = {
  id: string;
  market_code: string;
  country_code: string;
  region_code: string | null;
  city: string | null;
  name: string;
  display_name: string;
  zone_type: string;
  eligibility_status: string;
  currency_code: string | null;
  is_active: boolean;
  sort_order: number;
  default_delivery_zone_id?: string | null;
};

export type LinkedDeliveryZone = {
  id: string;
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
};

const ZONE_TYPES = [
  { value: "city", label: "Stad" },
  { value: "region", label: "Region / delstat" },
  { value: "metro", label: "Metro" },
  { value: "custom", label: "Anpassad" },
] as const;

function defaultCurrencyFor(market: string, country: string): string {
  const mc = market.trim().toUpperCase();
  const cc = country.trim().toUpperCase();
  if (mc === "US" || cc === "US") return "USD";
  return "SEK";
}

const ELIGIBILITY = [
  { value: "normal_checkout", label: "Vanlig utcheckning" },
  { value: "conditional_reservation", label: "Villkorad reservation" },
  { value: "interest_only", label: "Endast intresse" },
  { value: "browse_only", label: "Endast bläddra" },
  { value: "disabled", label: "Inaktiverad (dold för kund)" },
] as const;

interface GeoZoneFormProps {
  zone?: GeoZoneFormValues;
  linkedDelivery?: LinkedDeliveryZone | null;
}

export default function GeoZoneForm({ zone, linkedDelivery }: GeoZoneFormProps) {
  const router = useRouter();
  const [marketCode, setMarketCode] = useState(zone?.market_code ?? "EU");
  const [countryCode, setCountryCode] = useState(
    zone?.country_code?.toUpperCase() ?? "SE",
  );
  const [regionCode, setRegionCode] = useState(zone?.region_code ?? "");
  const [city, setCity] = useState(zone?.city ?? "");
  const [name, setName] = useState(zone?.name ?? "");
  const [displayName, setDisplayName] = useState(zone?.display_name ?? "");
  const [zoneType, setZoneType] = useState(
    zone?.zone_type && zone.zone_type !== "country" ? zone.zone_type : "city",
  );
  const [eligibility, setEligibility] = useState(
    zone?.eligibility_status ?? "normal_checkout",
  );
  const [currencyCode, setCurrencyCode] = useState(
    zone?.currency_code?.trim().toUpperCase() ||
      defaultCurrencyFor(zone?.market_code ?? "EU", zone?.country_code ?? "SE"),
  );

  useEffect(() => {
    if (zone) return;
    setCurrencyCode(defaultCurrencyFor(marketCode, countryCode));
  }, [marketCode, countryCode, zone]);
  const [isActive, setIsActive] = useState(zone?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(String(zone?.sort_order ?? 0));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cc = countryCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedDisplay = displayName.trim();
    const trimmedCity = city.trim();
    if (cc.length !== 2 || !trimmedName || !trimmedDisplay || !trimmedCity) {
      setError("Land, stad, internt namn och visningsnamn krävs.");
      setLoading(false);
      return;
    }

    const body: Record<string, unknown> = {
      country_code: cc,
      region_code: regionCode.trim() ? regionCode.trim().toUpperCase() : null,
      city: trimmedCity,
      name: trimmedName,
      display_name: trimmedDisplay,
      zone_type: zoneType,
      eligibility_status: eligibility,
      currency_code: currencyCode.trim().toUpperCase() || null,
      is_active: isActive,
      sort_order: Number.parseInt(sortOrder, 10) || 0,
    };

    if (!zone) {
      body.market_code = marketCode.trim();
    }

    try {
      if (zone) {
        const res = await fetch(`/api/admin/geo-zones/${zone.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error || "Kunde inte uppdatera vinzon");
        }
      } else {
        const res = await fetch("/api/admin/geo-zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error || "Kunde inte skapa vinzon");
        }
      }
      router.push("/admin/geo-zones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] space-y-6">
      <div className="rounded-lg border border-purple-200/80 bg-purple-50/50 px-4 py-3 dark:border-purple-900/40 dark:bg-purple-950/20">
        <p className="text-sm font-medium text-foreground">Leveranszon (pall)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Skapas eller uppdateras automatiskt med samma namn som visningsnamnet
          nedan. Koordinater sätts via geokodning på stad (150 km radie).
        </p>
        {linkedDelivery ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {linkedDelivery.name} · {linkedDelivery.radius_km} km ·{" "}
            {linkedDelivery.center_lat.toFixed(4)}, {linkedDelivery.center_lon.toFixed(4)}
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            Ingen leveranszon kopplad än — spara för att skapa.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gz-market">Marknad *</Label>
            <Select
              value={marketCode}
              onValueChange={setMarketCode}
              disabled={Boolean(zone)}
            >
              <SelectTrigger id="gz-market" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EU">EU</SelectItem>
                <SelectItem value="US">US</SelectItem>
              </SelectContent>
            </Select>
            {zone ? (
              <p className="text-xs text-muted-foreground">
                Marknad kan inte ändras efter skapande.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gz-cc">Landskod *</Label>
            <Input
              id="gz-cc"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.slice(0, 2))}
              maxLength={2}
              className="max-w-[120px] uppercase font-mono"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gz-region">Region / delstat</Label>
            <Input
              id="gz-region"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value.slice(0, 2))}
              maxLength={2}
              placeholder="t.ex. CA"
              className="max-w-[120px] uppercase font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gz-city">Stad *</Label>
            <Input
              id="gz-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="t.ex. Stockholm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Obligatoriskt. Vinzoner utan stad (t.ex. bara &quot;Sweden&quot;) visas inte för kunder.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gz-display">Visningsnamn (kund) *</Label>
          <Input
            id="gz-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Stockholm, Sweden"
            required
          />
          <p className="text-xs text-muted-foreground">
            Syns i vinzon-dropdown. Skapar/uppdaterar automatiskt en leveranszon i
            pallzoner med samma namn.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gz-name">Internt namn *</Label>
          <Input
            id="gz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Stockholm city"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gz-type">Zontyp *</Label>
            <Select value={zoneType} onValueChange={setZoneType}>
              <SelectTrigger id="gz-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gz-elig">Checkout / synlighet *</Label>
            <Select value={eligibility} onValueChange={setEligibility}>
              <SelectTrigger id="gz-elig" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELIGIBILITY.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="gz-currency">Valuta</Label>
            <Input
              id="gz-currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.slice(0, 3))}
              maxLength={3}
              className="max-w-[100px] uppercase font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gz-sort">Sortering</Label>
            <Input
              id="gz-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <input
              id="gz-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="gz-active" className="cursor-pointer font-normal">
              Aktiv (syns för kund om inte disabled)
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Avbryt
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Sparar…" : zone ? "Spara ändringar" : "Skapa vinzon"}
          </Button>
        </div>
      </form>
    </div>
  );
}
