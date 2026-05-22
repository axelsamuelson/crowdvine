import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";

export const ACTIVE_ZONE_CHANGED_EVENT = "pact:active-zone-changed" as const;

export type ActiveZoneChangedDetail = {
  activeZone?: ResolvedActiveGeoZone | null;
};

export function dispatchActiveZoneChanged(
  detail?: ActiveZoneChangedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ActiveZoneChangedDetail>(ACTIVE_ZONE_CHANGED_EVENT, {
      detail: detail ?? {},
    }),
  );
}

export function activeZoneFromChangedEvent(
  event: Event,
): ResolvedActiveGeoZone | null | undefined {
  if (!(event instanceof CustomEvent)) return undefined;
  const z = (event as CustomEvent<ActiveZoneChangedDetail>).detail?.activeZone;
  return z === undefined ? undefined : z;
}
