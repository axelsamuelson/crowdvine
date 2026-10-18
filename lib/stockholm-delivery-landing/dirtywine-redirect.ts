import { PACT_CONFIG } from "@/lib/site-config";
import {
  STOCKHOLM_DELIVERY_PATH,
  isStockholmDeliveryLandingPath,
} from "@/lib/stockholm-delivery-landing/config";

/**
 * Stockholm home-delivery landings are PACT-owned SEO.
 * On dirtywine.se they must not render — redirect to the same path on pactwines.com (301).
 */
export function isStockholmDeliveryRedirectPath(pathname: string): boolean {
  return isStockholmDeliveryLandingPath(pathname);
}

/** Absolute 301 target for a dirtywine Stockholm-delivery request. Preserves query string. */
export function pactStockholmDeliveryRedirectUrl(
  pathname: string,
  search: string = "",
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const qs = search && search !== "?" ? search : "";
  return `${PACT_CONFIG.baseUrl}${path}${qs}`;
}

export const STOCKHOLM_DELIVERY_SITEMAP_SLUGS = new Set<string>([
  STOCKHOLM_DELIVERY_PATH.sv.split("/").pop()!,
  STOCKHOLM_DELIVERY_PATH.en.split("/").pop()!,
]);
