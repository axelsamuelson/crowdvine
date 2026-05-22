"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ACTIVE_ZONE_CHANGED_EVENT,
  activeZoneFromChangedEvent,
  dispatchActiveZoneChanged,
} from "@/lib/events/active-zone-changed";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";
import { parseResolvedActiveZoneFromApi } from "@/lib/market/parse-active-zone-response";

export type EligibleGeoZoneRow = {
  id: string;
  display_name: string;
  market_code: string;
  country_code: string;
  region_code: string | null;
  city: string | null;
  zone_type: string;
  eligibility_status: string;
  currency_code: string | null;
};

type UseWineZoneSwitcherOptions = {
  /** Increment to refetch active zone + eligible list. */
  refreshNonce?: number;
  /**
   * When false, skips GET /api/geo-zones/eligible (e.g. header shopping context).
   * PDP switcher should keep the default true.
   */
  includeEligibleZones?: boolean;
};

/**
 * Shared data + PATCH for wine zone (active geo). Used by PDP switcher (full) and
 * compact header context (active zone only, optional skip eligible list).
 * Does not touch profiles — GET/PATCH /api/user/active-zone and optionally GET /api/geo-zones/eligible.
 */
export function useWineZoneSwitcher(options: UseWineZoneSwitcherOptions = {}) {
  const { refreshNonce = 0, includeEligibleZones = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<ResolvedActiveGeoZone | null>(
    null,
  );
  const [eligibleZones, setEligibleZones] = useState<EligibleGeoZoneRow[]>([]);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const patchingRef = useRef(false);
  const [zoneEventNonce, setZoneEventNonce] = useState(0);

  useEffect(() => {
    const onZoneChange = (event: Event) => {
      const fromEvent = activeZoneFromChangedEvent(event);
      if (fromEvent) {
        setActiveZone(fromEvent);
        setSignedIn(true);
        setLoading(false);
        return;
      }
      setZoneEventNonce((n) => n + 1);
    };
    window.addEventListener(ACTIVE_ZONE_CHANGED_EVENT, onZoneChange);
    return () =>
      window.removeEventListener(ACTIVE_ZONE_CHANGED_EVENT, onZoneChange);
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      let authed = false;
      try {
        const activeRes = await fetch("/api/user/active-zone", {
          cache: "no-store",
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;

        if (activeRes.status === 401) {
          setSignedIn(false);
          setActiveZone(null);
        } else {
          authed = true;
          setSignedIn(true);
          if (activeRes.ok) {
            const raw = await activeRes.json();
            setActiveZone(parseResolvedActiveZoneFromApi(raw));
          } else {
            const err = (await activeRes.json().catch(() => ({}))) as {
              error?: string;
            };
            toast.error(err.error ?? "Could not load your wine zone.");
            setActiveZone(null);
          }
        }

        if (includeEligibleZones) {
          const eligibleRes = await fetch("/api/geo-zones/eligible", {
            cache: "no-store",
            signal: ac.signal,
          });
          if (ac.signal.aborted) return;

          if (eligibleRes.ok) {
            const ez = (await eligibleRes.json()) as {
              geoZones?: EligibleGeoZoneRow[];
            };
            setEligibleZones(Array.isArray(ez.geoZones) ? ez.geoZones : []);
          } else {
            setEligibleZones([]);
            if (authed) {
              const err = (await eligibleRes.json().catch(() => ({}))) as {
                error?: string;
              };
              toast.error(err.error ?? "Could not load zone list.");
            }
          }
        } else {
          setEligibleZones([]);
        }
      } catch (e: unknown) {
        if (ac.signal.aborted) return;
        const name = e instanceof Error ? e.name : "";
        if (name === "AbortError") return;
        if (authed) {
          toast.error("Could not load wine zones.");
        }
        setEligibleZones([]);
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [refreshNonce, zoneEventNonce, includeEligibleZones, pathname]);

  const selectZone = useCallback(
    async (zoneId: string, successMessage = "Wine zone updated.") => {
      if (!zoneId || patchingRef.current) return false;
      patchingRef.current = true;
      setPatchingId(zoneId);
      try {
        const res = await fetch("/api/user/active-zone", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeGeoZoneId: zoneId }),
        });
        const raw = await res.json().catch(() => (null));
        if (!res.ok) {
          const msg =
            raw &&
            typeof raw === "object" &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : "Could not update wine zone.";
          toast.error(msg);
          return false;
        }
        const normalized = parseResolvedActiveZoneFromApi(raw);
        if (normalized) {
          setActiveZone(normalized);
        }
        toast.success(successMessage);
        dispatchActiveZoneChanged(
          normalized ? { activeZone: normalized } : undefined,
        );
        // Defer RSC refresh so in-flight client fetches (shopping context) are not aborted.
        window.setTimeout(() => router.refresh(), 150);
        return true;
      } catch {
        toast.error("Could not update wine zone.");
        return false;
      } finally {
        patchingRef.current = false;
        setPatchingId(null);
      }
    },
    [router],
  );

  return {
    signedIn,
    loading,
    activeZone,
    setActiveZone,
    eligibleZones,
    patchingId,
    selectZone,
  };
}
