/**
 * Channel availability for a Swedish checkout postal destination.
 *
 * Shared pallet (Budbee/Instabee last-mile) requires a matched delivery zone
 * and Budbee HOME_DELIVERY eligibility. Direct box (UPS Standard) is open to
 * all Swedish postals when the feature flag + carrier + rates allow it.
 *
 * Pure helpers — safe for unit tests (Kiruna vs Stockholm) without network.
 */

import type { FulfillmentChannel } from "@/lib/commerce/fulfillment-channel";

export type PostalZoneMatch =
  | "in_zone"
  | "out_of_zone"
  | "unsupported_country"
  | "unknown";

export type FulfillmentPostalAvailabilityInput = {
  /** Matched pallet delivery zone (geo radius), not Instabee itself. */
  zoneMatch: PostalZoneMatch;
  /**
   * Instabee Budbee HOME_DELIVERY for the postal.
   * null = not checked / fail-open for shared (same as today’s UI).
   */
  budbeeAvailable: boolean | null;
  /** DIRECT_BOX_CHECKOUT_ENABLED */
  directBoxCheckoutEnabled: boolean;
  /** Server carrier+quoting gate for the destination country. */
  directBoxDeliverySelectable: boolean;
  /** ISO country of the destination (SE required for direct Sweden-wide). */
  countryCode?: string | null;
};

export type FulfillmentPostalAvailability = {
  sharedPalletAvailable: boolean;
  directBoxAvailable: boolean;
  /** Machine reason when shared is unavailable (UI explanation). */
  sharedUnavailableReason:
    | null
    | "out_of_zone"
    | "budbee_unavailable"
    | "unsupported_country";
  /** True only when neither channel can fulfill. */
  noFulfillmentAvailable: boolean;
  /** Channels that can take the order right now. */
  availableChannels: FulfillmentChannel[];
  /**
   * Preferred channel when the current selection is unavailable.
   * Prefer direct when shared is out of zone/Budbee and direct works.
   */
  preferredChannel: FulfillmentChannel | null;
  /** Fire postal_out_of_zone / no_delivery_zone only when this is true. */
  shouldLogPostalOutOfZone: boolean;
};

function normalizeCountry(code: string | null | undefined): string {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

/**
 * Resolve which fulfillment channels are available for this postal context.
 */
export function resolveFulfillmentPostalAvailability(
  input: FulfillmentPostalAvailabilityInput,
): FulfillmentPostalAvailability {
  const country = normalizeCountry(input.countryCode);

  if (input.zoneMatch === "unsupported_country") {
    return {
      sharedPalletAvailable: false,
      directBoxAvailable: false,
      sharedUnavailableReason: "unsupported_country",
      noFulfillmentAvailable: true,
      availableChannels: [],
      preferredChannel: null,
      shouldLogPostalOutOfZone: true,
    };
  }

  const outOfZone = input.zoneMatch === "out_of_zone";
  const budbeeHardNo = input.budbeeAvailable === false;
  const sharedUnavailableReason: FulfillmentPostalAvailability["sharedUnavailableReason"] =
    outOfZone
      ? "out_of_zone"
      : budbeeHardNo
        ? "budbee_unavailable"
        : null;
  const sharedPalletAvailable = !outOfZone && !budbeeHardNo;

  const swedenOrUnknown = !country || country === "SE";
  const directBoxAvailable =
    input.directBoxCheckoutEnabled &&
    input.directBoxDeliverySelectable &&
    swedenOrUnknown;

  const availableChannels: FulfillmentChannel[] = [];
  if (sharedPalletAvailable) availableChannels.push("shared_pallet");
  if (directBoxAvailable) availableChannels.push("direct_box");

  const noFulfillmentAvailable = availableChannels.length === 0;

  let preferredChannel: FulfillmentChannel | null = null;
  if (availableChannels.length === 1) {
    preferredChannel = availableChannels[0]!;
  } else if (availableChannels.length > 1) {
    // Keep shared as default when both work (today’s product default).
    preferredChannel = "shared_pallet";
  }

  // When shared is blocked by postal but direct works, force direct.
  if (!sharedPalletAvailable && directBoxAvailable) {
    preferredChannel = "direct_box";
  }

  return {
    sharedPalletAvailable,
    directBoxAvailable,
    sharedUnavailableReason,
    noFulfillmentAvailable,
    availableChannels,
    preferredChannel,
    // Only when the customer truly cannot check out for this postal.
    shouldLogPostalOutOfZone:
      noFulfillmentAvailable &&
      (outOfZone || budbeeHardNo || input.zoneMatch === "unknown"),
  };
}

/**
 * Whether checkout submit / confirm must hard-block on NO_DELIVERY_ZONE.
 * Direct box may proceed without a matched pallet delivery zone.
 */
export function shouldHardBlockNoDeliveryZone(input: {
  zoneError: "NO_DELIVERY_ZONE" | "UNSUPPORTED_COUNTRY" | null | undefined;
  fulfillmentChannel: FulfillmentChannel;
  directBoxCheckoutEnabled: boolean;
  directBoxDeliverySelectable: boolean;
  countryCode?: string | null;
}): boolean {
  if (input.zoneError === "UNSUPPORTED_COUNTRY") return true;
  if (input.zoneError !== "NO_DELIVERY_ZONE") return false;

  const availability = resolveFulfillmentPostalAvailability({
    zoneMatch: "out_of_zone",
    // Zone miss alone; Budbee is a separate advisory/hard gate.
    budbeeAvailable: null,
    directBoxCheckoutEnabled: input.directBoxCheckoutEnabled,
    directBoxDeliverySelectable: input.directBoxDeliverySelectable,
    countryCode: input.countryCode,
  });

  // Soft: direct can fulfill Sweden-wide without a pallet delivery zone.
  if (availability.directBoxAvailable) {
    return input.fulfillmentChannel !== "direct_box";
  }
  return true;
}

/** Confirm/PI: shared_pallet still requires a delivery zone id. */
export function requiresDeliveryZoneIdForChannel(
  channel: FulfillmentChannel,
): boolean {
  return channel === "shared_pallet";
}
