/**
 * Checkout zone / location helpers driven by the customer's saved postal —
 * not by the active shopping-geo cookie (often Stockholm by default).
 *
 * Root cause of Camille's reload bug (98131 Kiruna): authenticated
 * `/api/checkout/zones` passed `preferredDeliveryZoneId` from the Stockholm
 * wine zone, and `determineZones` short-circuited geocoding → Delad pall
 * looked available after reload. Policy helpers live in `lib/zone-matching.ts`
 * (`mayBypassGeocodeWithPreferredDeliveryZone`); this module covers UI label,
 * contact merge, and channel persistence.
 */

import { locationLabelFromZone } from "@/lib/market/location-label";
import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import { parseFulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import type { ZoneDeliveryLines } from "@/lib/checkout/user-zone-delivery-template";

/** sessionStorage key — channel choice must survive reload (acceptance B). */
export const CHECKOUT_FULFILLMENT_CHANNEL_STORAGE_KEY =
  "pact_checkout_fulfillment_channel";

/** Local copy of Stockholm-area heuristic — avoid importing zone-matching here. */
function isLikelyStockholmAreaPostal(postcode: string | null | undefined): boolean {
  const digits = String(postcode ?? "").replace(/\D/g, "");
  if (digits.length < 2) return false;
  const prefix = Number.parseInt(digits.slice(0, 2), 10);
  return Number.isFinite(prefix) && prefix >= 10 && prefix <= 19;
}

export type CheckoutShoppingLocationInput = {
  /** City from saved / draft delivery for the entered postal. */
  deliveryCity?: string | null;
  deliveryCountryCode?: string | null;
  postal?: string | null;
  /** Active shopping geo (cookie / preference) — often Stockholm. */
  activeDisplayName?: string | null;
  activeCountryCode?: string | null;
  locale: "en" | "sv";
};

/**
 * "Handlar i" label: prefer the ort tied to the saved postal over the default
 * Stockholm shopping-geo cookie (acceptance C).
 */
export function resolveCheckoutShoppingLocationLabel(
  input: CheckoutShoppingLocationInput,
): string | null {
  const city = (input.deliveryCity ?? "").trim();
  const postal = (input.postal ?? "").trim();
  const deliveryCc = (input.deliveryCountryCode ?? "").trim().toUpperCase();
  const activeCc = (input.activeCountryCode ?? "").trim().toUpperCase();
  const cc = deliveryCc.length === 2 ? deliveryCc : activeCc;

  if (city) {
    // Ignore shopping-geo Stockholm when postal is clearly outside that area
    // but draft city was contaminated from activeShop.
    const looksContaminated =
      /^stockholm$/i.test(city) &&
      postal.length > 0 &&
      !isLikelyStockholmAreaPostal(postal);
    if (!looksContaminated) {
      const countryLabel =
        cc === "SE"
          ? input.locale === "en"
            ? "Sweden"
            : "Sverige"
          : cc;
      const display = cc ? `${city}, ${countryLabel}` : city;
      return locationLabelFromZone(display, cc || "SE", input.locale, city);
    }
  }

  const activeName = (input.activeDisplayName ?? "").trim();
  if (!activeName) return null;
  // Don't keep advertising Stockholm when postal is Kiruna etc.
  if (
    postal &&
    !isLikelyStockholmAreaPostal(postal) &&
    /stockholm/i.test(activeName)
  ) {
    return null;
  }
  return locationLabelFromZone(
    activeName,
    cc || "SE",
    input.locale,
    activeName,
  );
}

export type ProfileContactFields = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Auth profile contact wins over a stale zone-address template email/name/phone
 * (acceptance D — never keep an older email from user_zone_addresses).
 */
export function mergeProfileContactIntoDelivery(
  lines: ZoneDeliveryLines | null,
  profile: ProfileContactFields | null | undefined,
): ZoneDeliveryLines | null {
  if (!lines) return null;
  if (!profile) return lines;
  const fullName = (profile.fullName ?? "").trim();
  const email = (profile.email ?? "").trim();
  const phone = (profile.phone ?? "").trim();
  if (!fullName && !email && !phone) return lines;
  return {
    ...lines,
    fullName: fullName || lines.fullName,
    // Profile email always replaces zone template when present.
    email: email || lines.email,
    phone: phone || lines.phone,
  };
}

export function readStoredFulfillmentChannel(): FulfillmentChannel | null {
  if (typeof window === "undefined") return null;
  try {
    return parseFulfillmentChannel(
      window.sessionStorage.getItem(CHECKOUT_FULFILLMENT_CHANNEL_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function storeFulfillmentChannel(channel: FulfillmentChannel): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHECKOUT_FULFILLMENT_CHANNEL_STORAGE_KEY,
      channel,
    );
  } catch {
    /* private mode */
  }
}

/**
 * Restore a saved channel only when it is still offered for this postal.
 */
export function resolveFulfillmentChannelAfterReload(args: {
  stored: FulfillmentChannel | null;
  sharedPalletAvailable: boolean;
  directBoxAvailable: boolean;
  fallback: FulfillmentChannel;
}): FulfillmentChannel {
  const { stored, sharedPalletAvailable, directBoxAvailable, fallback } = args;
  if (stored === "direct_box" && directBoxAvailable) return "direct_box";
  if (stored === "shared_pallet" && sharedPalletAvailable) {
    return "shared_pallet";
  }
  if (!sharedPalletAvailable && directBoxAvailable) return "direct_box";
  if (sharedPalletAvailable && !directBoxAvailable) return "shared_pallet";
  return fallback;
}
