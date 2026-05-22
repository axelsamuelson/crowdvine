"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DetectedLocation } from "@/lib/geo-zones/detect-zone";

export type EligibleGeoZoneRow = {
  id: string;
  display_name: string;
  eligibility_status: string;
  country_code?: string | null;
  region_code?: string | null;
  city?: string | null;
  name?: string | null;
};

function eligibilityLabel(status: string): string {
  const s = status.trim().toLowerCase().replace(/-/g, "_");
  if (s === "normal_checkout") return "Normal checkout";
  if (s === "conditional_reservation") return "Conditional reservation";
  if (s === "interest_only") return "Interest only";
  return status.replace(/_/g, " ");
}

export interface InviteWineZoneFieldProps {
  id?: string;
  value: string;
  onValueChange: (zoneId: string) => void;
  disabled?: boolean;
  className?: string;
  /** When set, skips internal fetch (parent already loaded zones). */
  zones?: EligibleGeoZoneRow[];
  detectedLocation?: DetectedLocation | null;
  /** IP auto-match applied; show US detected hint until user changes zone. */
  zoneAutoDetected?: boolean;
  /** User changed zone after auto-detect — hides detected hint. */
  zoneManuallyChanged?: boolean;
  /** US visitor but no zone matched — optional helper copy. */
  showUsNoMatchHint?: boolean;
  label?: string;
  placeholder?: string;
  /** When false, option text is display_name only (city picker). */
  showEligibilitySuffix?: boolean;
  hideGeoHints?: boolean;
  /** Light inputs for invite-opus landing (not dark/black). */
  variant?: "default" | "invite";
}

export function InviteWineZoneField({
  id = "invite-wine-zone",
  value,
  onValueChange,
  disabled,
  className,
  zones: zonesProp,
  detectedLocation,
  zoneAutoDetected = false,
  zoneManuallyChanged = false,
  showUsNoMatchHint = false,
  label = "Choose your wine zone",
  placeholder = "Select a wine zone",
  showEligibilitySuffix = true,
  hideGeoHints = false,
  variant = "default",
}: InviteWineZoneFieldProps) {
  const isInvite = variant === "invite";
  const [rows, setRows] = useState<EligibleGeoZoneRow[]>(zonesProp ?? []);
  const [loading, setLoading] = useState(!zonesProp);

  useEffect(() => {
    if (zonesProp) {
      setRows(zonesProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geo-zones/eligible", { cache: "no-store" });
        const data = (await res.json()) as { geoZones?: EligibleGeoZoneRow[] };
        if (!cancelled) {
          setRows(Array.isArray(data.geoZones) ? data.geoZones : []);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zonesProp]);

  const isUs = detectedLocation?.country?.trim().toUpperCase() === "US";
  const showDetectedHint =
    !hideGeoHints &&
    isUs &&
    zoneAutoDetected &&
    !zoneManuallyChanged &&
    Boolean(value?.trim()) &&
    Boolean(detectedLocation?.city || detectedLocation?.region);

  const handleValueChange = (zoneId: string) => {
    onValueChange(zoneId);
  };

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const detectedCity = detectedLocation?.city?.trim();
  const detectedRegion = detectedLocation?.region?.trim();

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value={value || undefined}
        onValueChange={handleValueChange}
        disabled={disabled || rows.length === 0}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "w-full",
            isInvite
              ? "invite-form-control bg-white border-input shadow-sm text-slate-900 dark:text-slate-900 data-[placeholder]:text-slate-500 dark:data-[placeholder]:text-slate-500"
              : "bg-background",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={isInvite ? "invite-select-content" : undefined}
        >
          {rows.map((z) => (
            <SelectItem
              key={z.id}
              value={z.id}
              className={
                isInvite
                  ? "text-slate-900 dark:text-slate-900 focus:bg-slate-100 focus:text-slate-900 dark:focus:bg-slate-100 dark:focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 dark:data-[highlighted]:bg-slate-100 dark:data-[highlighted]:text-slate-900"
                  : undefined
              }
            >
              {z.display_name?.trim() || z.id}
              {showEligibilitySuffix
                ? ` · ${eligibilityLabel(z.eligibility_status)}`
                : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showDetectedHint && (
        <p className="text-xs text-muted-foreground">
          Detected: {[detectedCity, detectedRegion].filter(Boolean).join(", ")}
          {". Change if needed"}
        </p>
      )}
      {!hideGeoHints && showUsNoMatchHint && isUs && !zoneAutoDetected && !value?.trim() && (
        <p className="text-xs text-muted-foreground">
          We detected you&apos;re in the US. Select your nearest delivery zone
        </p>
      )}
    </div>
  );
}
