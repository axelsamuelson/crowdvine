import { GEO_COUNTRY_COOKIE } from "@/lib/analytics/visitor-identity";
import {
  countryPolicy,
  normalizeCountryCode,
  shipToCanCheckout,
} from "@/lib/market/country-registry";
import { SHIP_TO_COOKIE } from "@/lib/checkout/ship-to-gate";

export const WAITLIST_OPEN_EVENT = "waitlist-open-request";

export type WaitlistOpenDetail = {
  countryCode: string;
  wineId: string;
  quantity: number;
};

export function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function readShipToCookie(): string | null {
  return normalizeCountryCode(readBrowserCookie(SHIP_TO_COOKIE));
}

export function readGeoCountryCookie(): string | null {
  return normalizeCountryCode(readBrowserCookie(GEO_COUNTRY_COOKIE));
}

/** Cookie wins. Otherwise the geo suggestion. Null when neither is set. */
export function effectiveShipToCountry(): string | null {
  return readShipToCookie() ?? readGeoCountryCookie();
}

export function shipToBlocksPurchase(): boolean {
  const code = effectiveShipToCountry();
  if (!code) return false;
  return !shipToCanCheckout(code);
}

export function requestWaitlistOpen(detail: WaitlistOpenDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WaitlistOpenDetail>(WAITLIST_OPEN_EVENT, { detail }),
  );
}

export function openWaitlistForCurrentShipTo(wineId: string, quantity: number): void {
  const countryCode = effectiveShipToCountry() ?? countryPolicy(null).countryCode;
  requestWaitlistOpen({ countryCode, wineId, quantity });
}
