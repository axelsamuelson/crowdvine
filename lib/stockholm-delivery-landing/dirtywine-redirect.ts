import {
  LEGACY_HOME_DELIVERY_SHOP_PATH,
  resolveHomeDeliveryGuidePath,
} from "@/lib/guides/home-delivery-guide";
import { PACT_CONFIG } from "@/lib/site-config";
import { isStockholmDeliveryLandingPath } from "@/lib/stockholm-delivery-landing/config";

/**
 * Legacy Stockholm shop landings are PACT-owned SEO (now the home-delivery guide).
 * On dirtywine.se they must not render — 301 one hop to the guide on pactwines.com.
 */
export function isStockholmDeliveryRedirectPath(pathname: string): boolean {
  return isStockholmDeliveryLandingPath(pathname);
}

/** Absolute 301 target for a dirtywine Stockholm-delivery request. Preserves query string. */
export function pactStockholmDeliveryRedirectUrl(
  pathname: string,
  search: string = "",
): string {
  const target =
    resolveHomeDeliveryGuidePath(pathname) ??
    (pathname.startsWith("/") ? pathname : `/${pathname}`);
  const qs = search && search !== "?" ? search : "";
  return `${PACT_CONFIG.baseUrl}${target}${qs}`;
}

export const STOCKHOLM_DELIVERY_SITEMAP_SLUGS = new Set<string>([
  LEGACY_HOME_DELIVERY_SHOP_PATH.sv.split("/").pop()!,
  LEGACY_HOME_DELIVERY_SHOP_PATH.en.split("/").pop()!,
]);
