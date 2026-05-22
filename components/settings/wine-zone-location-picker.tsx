"use client";

import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EligibleGeoZoneRow } from "@/lib/hooks/use-wine-zone-switcher";
import {
  groupEligibleZonesByRegion,
  zoneCardTitle,
  zonePrimaryLanguageLabel,
  type ZonePickerRegionGroup,
} from "@/lib/geo-zones/zone-picker-groups";
import { resolveDisplayCurrencyCode } from "@/lib/shopping-context/currency-policy";

function LocationCard({
  zone,
  selected,
  busy,
  locale,
  onSelect,
}: {
  zone: EligibleGeoZoneRow;
  selected: boolean;
  busy: boolean;
  locale: "en" | "sv";
  onSelect: () => void;
}) {
  const title = zoneCardTitle(zone, locale);
  const language = zonePrimaryLanguageLabel(zone, locale);
  const currency = resolveDisplayCurrencyCode({
    zoneCurrencyCode: zone.currency_code,
    countryCode: zone.country_code,
    marketCode: zone.market_code,
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={busy}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-background px-4 py-3.5 text-left transition-colors",
        "hover:border-foreground/30 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
        selected
          ? "border-foreground ring-1 ring-foreground/10"
          : "border-border",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-foreground/20 bg-foreground/5 text-foreground"
            : "border-border bg-muted/40 text-muted-foreground",
        )}
        aria-hidden
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" strokeWidth={1.75} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {language}
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          {currency}
        </span>
      </span>
    </button>
  );
}

export function WineZoneLocationPicker({
  zones,
  activeZoneId,
  patchingId,
  locale,
  onSelectZone,
}: {
  zones: EligibleGeoZoneRow[];
  activeZoneId: string;
  patchingId: string | null;
  locale: "en" | "sv";
  onSelectZone: (zoneId: string) => void;
}) {
  const groups: ZonePickerRegionGroup[] = groupEligibleZonesByRegion(zones, locale);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.zones.map((zone) => {
              const selected = zone.id === activeZoneId;
              const busy = patchingId === zone.id;
              return (
                <LocationCard
                  key={zone.id}
                  zone={zone}
                  selected={selected}
                  busy={busy}
                  locale={locale}
                  onSelect={() => onSelectZone(zone.id)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
