/**
 * B2B (Dirty Wine) vs B2C (PACT) site detection.
 *
 * - dirtywine.se → B2B
 * - pactwines.com → B2C
 * - localhost / 127.0.0.1 → B2C by default (mirrors pactwines.com)
 * - localhost with ?b2b=1 → B2B (mirrors dirtywine.se)
 */

export type PortalSearchParams = {
  get: (key: string) => string | null;
};

export function isLocalDevHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return h === "localhost" || h === "127.0.0.1";
}

export function isDirtywineProductionHost(host: string | null): boolean {
  if (!host) return false;
  return host.toLowerCase().split(":")[0].includes("dirtywine.se");
}

export function isPactProductionHost(host: string | null): boolean {
  if (!host) return false;
  return host.toLowerCase().split(":")[0].includes("pactwines.com");
}

/** Local dev only: force Dirty Wine / B2B mode (?b2b=1). */
export function isForceB2BDevMode(
  searchParams?: PortalSearchParams | null,
): boolean {
  if (!searchParams) return false;
  return searchParams.get("b2b") === "1";
}

/**
 * True when the host should use Dirty Wine / B2B behavior (logos, prices exkl. VAT, stock rules).
 */
export function isDirtywineHost(
  host: string | null,
  searchParams?: PortalSearchParams | null,
): boolean {
  if (!host) return false;
  if (isDirtywineProductionHost(host)) return true;
  if (isLocalDevHost(host)) return isForceB2BDevMode(searchParams);
  return false;
}

/** Alias used by product APIs and server data loaders. */
export function isB2BHost(
  host: string | null,
  searchParams?: PortalSearchParams | null,
): boolean {
  return isDirtywineHost(host, searchParams);
}

/** True when the host should use PACT / B2C behavior. */
export function isPactHost(
  host: string | null,
  searchParams?: PortalSearchParams | null,
): boolean {
  if (!host) return false;
  if (isPactProductionHost(host)) return true;
  if (isLocalDevHost(host)) return !isForceB2BDevMode(searchParams);
  return false;
}

/** @deprecated Use isDirtywineHost */
export const isB2BModeForHost = isDirtywineHost;

/**
 * @deprecated Use isDirtywineHost(host, searchParams). Kept for older header bundles.
 */
export function isDirtywineSiteEnabled(
  host?: string | null,
  searchParams?: PortalSearchParams | null,
): boolean {
  const h =
    host ??
    (typeof window !== "undefined" ? window.location.hostname : null);
  const params =
    searchParams ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null);
  return isDirtywineHost(h, params);
}
