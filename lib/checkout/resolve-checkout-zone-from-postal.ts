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

/**
 * Marks that the stored channel was an explicit radio pick (not auto-select
 * when shared was out_of_zone). Without this, GBG→auto-Direct poisoned 11151
 * reloads (Camille 22/11).
 */
export const CHECKOUT_FULFILLMENT_USER_SET_KEY =
  "pact_checkout_fulfillment_user_set";

/**
 * Guest postal / address lines for reload (Camille 22/11: 3/4 runs wiped
 * postal after remount). sessionStorage only — no DOB; scrub list aware.
 */
export const CHECKOUT_POSTAL_DRAFT_STORAGE_KEY = "pact_checkout_postal_draft";

export type CheckoutPostalDraftStored = {
  postal: string;
  city?: string;
  street?: string;
  countryCode?: string;
  regionCode?: string | null;
};

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

export function readStoredFulfillmentUserSet(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CHECKOUT_FULFILLMENT_USER_SET_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persist channel. Pass `userSet: true` only for explicit radio clicks —
 * never for auto-select when shared is out of zone.
 */
export function storeFulfillmentChannel(
  channel: FulfillmentChannel,
  opts?: { userSet?: boolean },
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHECKOUT_FULFILLMENT_CHANNEL_STORAGE_KEY,
      channel,
    );
    if (opts?.userSet) {
      window.sessionStorage.setItem(CHECKOUT_FULFILLMENT_USER_SET_KEY, "1");
    }
  } catch {
    /* private mode */
  }
}

export function readStoredPostalDraft(): CheckoutPostalDraftStored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_POSTAL_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutPostalDraftStored;
    const postal = String(parsed?.postal ?? "")
      .trim()
      .replace(/\s+/g, "");
    if (!postal) return null;
    return {
      postal,
      city: typeof parsed.city === "string" ? parsed.city : undefined,
      street: typeof parsed.street === "string" ? parsed.street : undefined,
      countryCode:
        typeof parsed.countryCode === "string" ? parsed.countryCode : undefined,
      regionCode:
        parsed.regionCode === null || typeof parsed.regionCode === "string"
          ? parsed.regionCode
          : undefined,
    };
  } catch {
    return null;
  }
}

export function storePostalDraft(draft: CheckoutPostalDraftStored): void {
  if (typeof window === "undefined") return;
  const postal = String(draft.postal ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (!postal) return;
  try {
    const payload: CheckoutPostalDraftStored = {
      postal,
      city: draft.city?.trim() || undefined,
      street: draft.street?.trim() || undefined,
      countryCode: draft.countryCode?.trim() || undefined,
      regionCode: draft.regionCode ?? null,
    };
    window.sessionStorage.setItem(
      CHECKOUT_POSTAL_DRAFT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    /* private mode */
  }
}

/** Clear guest postal draft (Byt / wipe). */
export function clearStoredPostalDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_POSTAL_DRAFT_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Clear sticky channel + userSet flag so the next postal re-evaluates
 * availability (Byt must not keep auto-Direct from a prior out_of_zone).
 */
export function clearStoredFulfillmentChannel(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_FULFILLMENT_CHANNEL_STORAGE_KEY);
    window.sessionStorage.removeItem(CHECKOUT_FULFILLMENT_USER_SET_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Restore a saved channel only when it is still offered for this postal.
 *
 * Explicit user picks (`userSet`) survive reload when still available
 * (acceptance B). Auto-selected Direct from an out-of-zone postal must NOT
 * override the product default (shared) when both channels work for the new
 * postal (Camille 11151 after GBG).
 */
export function resolveFulfillmentChannelAfterReload(args: {
  stored: FulfillmentChannel | null;
  /** True only when the customer clicked a channel radio. */
  userSet?: boolean;
  sharedPalletAvailable: boolean;
  directBoxAvailable: boolean;
  fallback: FulfillmentChannel;
}): FulfillmentChannel {
  const {
    stored,
    userSet = false,
    sharedPalletAvailable,
    directBoxAvailable,
    fallback,
  } = args;
  if (userSet && stored === "direct_box" && directBoxAvailable) {
    return "direct_box";
  }
  if (userSet && stored === "shared_pallet" && sharedPalletAvailable) {
    return "shared_pallet";
  }
  if (!sharedPalletAvailable && directBoxAvailable) return "direct_box";
  if (sharedPalletAvailable && !directBoxAvailable) return "shared_pallet";
  if (sharedPalletAvailable) return "shared_pallet";
  if (directBoxAvailable) return "direct_box";
  return fallback;
}
