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

type EligibleRow = {
  id: string;
  display_name: string;
  eligibility_status: string;
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
}

export function InviteWineZoneField({
  id = "invite-wine-zone",
  value,
  onValueChange,
  disabled,
  className,
}: InviteWineZoneFieldProps) {
  const [rows, setRows] = useState<EligibleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geo-zones/eligible", { cache: "no-store" });
        const data = (await res.json()) as { geoZones?: EligibleRow[] };
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
  }, []);

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>Choose your wine zone</Label>
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || rows.length === 0}
      >
        <SelectTrigger id={id} className="bg-background">
          <SelectValue placeholder="Select a wine zone" />
        </SelectTrigger>
        <SelectContent>
          {rows.map((z) => (
            <SelectItem key={z.id} value={z.id}>
              {z.display_name?.trim() || z.id} —{" "}
              {eligibilityLabel(z.eligibility_status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
