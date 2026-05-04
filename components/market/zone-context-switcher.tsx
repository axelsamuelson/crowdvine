"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useWineZoneSwitcher,
  type EligibleGeoZoneRow,
} from "@/lib/hooks/use-wine-zone-switcher";

function eligibilityLabel(status: string): string {
  const s = status.trim().toLowerCase().replace(/-/g, "_");
  if (s === "normal_checkout") return "Normal checkout";
  if (s === "conditional_reservation") return "Conditional reservation";
  if (s === "interest_only") return "Interest only";
  return status.replace(/_/g, " ");
}

function regionHint(z: EligibleGeoZoneRow): string {
  const cc = (z.country_code ?? "").toUpperCase();
  const rc = z.region_code?.trim().toUpperCase() ?? "";
  if (rc) return `${cc} · ${rc}`;
  return cc || "";
}

export type { EligibleGeoZoneRow };

export interface ZoneContextSwitcherProps {
  /** Refetch PDP zone-status after a successful zone change. */
  onActiveZoneUpdated?: () => void;
  /** Increment to reload active zone + eligible list from APIs. */
  refreshNonce?: number;
  className?: string;
}

export function ZoneContextSwitcher({
  onActiveZoneUpdated,
  refreshNonce = 0,
  className,
}: ZoneContextSwitcherProps) {
  const [open, setOpen] = useState(false);
  const {
    signedIn,
    loading,
    activeZone,
    eligibleZones,
    patchingId,
    selectZone,
  } = useWineZoneSwitcher({ refreshNonce });

  const onSelectZone = async (zoneId: string) => {
    const ok = await selectZone(zoneId);
    if (ok) {
      setOpen(false);
      onActiveZoneUpdated?.();
    }
  };

  if (signedIn === false) {
    return null;
  }

  const currency =
    activeZone?.currencyCode?.trim().toUpperCase() || "SEK";
  const headline =
    activeZone?.displayName?.trim() || "Your shopping zone";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        {loading ? (
          <>
            <Skeleton className="h-3 w-24 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Shopping in
            </p>
            <p className="truncate text-sm font-medium text-foreground">
              {headline}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {currency}
              </span>
            </p>
            {activeZone?.eligibilityStatus ? (
              <p className="text-xs text-muted-foreground">
                {eligibilityLabel(activeZone.eligibilityStatus)}
              </p>
            ) : null}
          </>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-border/80"
            disabled={loading || signedIn !== true}
          >
            Change zone
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(100vw-2rem,22rem)] p-0"
          sideOffset={6}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-foreground">
              Choose your wine zone
            </p>
            <p className="text-xs text-muted-foreground">
              Pallet availability updates for this zone.
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {eligibleZones.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No zones available.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {eligibleZones.map((z) => {
                  const activeId = activeZone?.geoZoneId ?? "";
                  const isCurrent = Boolean(activeId && z.id === activeId);
                  const busy = patchingId === z.id;
                  return (
                    <li key={z.id}>
                      <button
                        type="button"
                        disabled={busy || isCurrent}
                        onClick={() => void onSelectZone(z.id)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left text-sm transition-colors",
                          isCurrent
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted/80",
                          (busy || isCurrent) && "opacity-80",
                        )}
                      >
                        <span className="font-medium leading-tight">
                          {z.display_name?.trim() || z.id}
                          {isCurrent ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              (current)
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {regionHint(z)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {eligibilityLabel(z.eligibility_status)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
