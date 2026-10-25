import type { AppLocale } from "@/lib/i18n/locale";

/** Canonical home-delivery explainer (PACT guides). */
export const HOME_DELIVERY_GUIDE_PATH = {
  sv: "/guider/hemleverans-av-naturvin",
  en: "/guides/natural-wine-home-delivery",
} as const;

/** Former shop landing URLs that 301 to the guide (one hop). */
export const LEGACY_HOME_DELIVERY_SHOP_PATH = {
  sv: "/vin/naturvin-hemleverans-stockholm",
  en: "/wine/natural-wine-delivery-stockholm",
} as const;

export const LEGACY_HOME_DELIVERY_SHOP_SLUG = {
  sv: "naturvin-hemleverans-stockholm",
  en: "natural-wine-delivery-stockholm",
} as const;

export function homeDeliveryGuidePath(locale: AppLocale): string {
  return HOME_DELIVERY_GUIDE_PATH[locale];
}

export function resolveHomeDeliveryGuidePath(
  pathname: string,
): string | null {
  if (pathname === LEGACY_HOME_DELIVERY_SHOP_PATH.sv) {
    return HOME_DELIVERY_GUIDE_PATH.sv;
  }
  if (pathname === LEGACY_HOME_DELIVERY_SHOP_PATH.en) {
    return HOME_DELIVERY_GUIDE_PATH.en;
  }
  return null;
}

export function isLegacyHomeDeliveryShopPath(pathname: string): boolean {
  return resolveHomeDeliveryGuidePath(pathname) != null;
}
