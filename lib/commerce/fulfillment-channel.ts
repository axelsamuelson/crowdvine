/**
 * Fulfillment channel policy for B2C checkout.
 *
 * Two channels:
 * - shared_pallet — existing collective fill + Budbee/Instabee last-mile
 * - direct_box — independent of selectedPallet / pallet fill / Budbee eligibility
 *
 * Production enablement MUST stay behind an explicit flag. Until a carrier
 * contract is configured for direct_box, carrier state is unavailable /
 * not_quoted — never pretend a service works.
 *
 * Customer shipping REVENUE stays in customer_shipping_rates (external
 * config). This module never seeds or overwrites flat fees (e.g. 99 SEK).
 */

import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";

export const FULFILLMENT_CHANNELS = ["shared_pallet", "direct_box"] as const;
export type FulfillmentChannel = (typeof FULFILLMENT_CHANNELS)[number];

/** Env / admin gate — default OFF so unverified direct fulfilment cannot go live. */
export function isDirectBoxCheckoutEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return String(env.DIRECT_BOX_CHECKOUT_ENABLED ?? "")
    .trim()
    .toLowerCase() === "true";
}

export function parseFulfillmentChannel(
  raw: string | null | undefined,
): FulfillmentChannel | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (v === "shared_pallet" || v === "pallet" || v === "shared") {
    return "shared_pallet";
  }
  if (v === "direct_box" || v === "directbox") {
    return "direct_box";
  }
  return null;
}

/** Default channel when UI does not offer a choice (today’s production). */
export function defaultFulfillmentChannel(): FulfillmentChannel {
  return "shared_pallet";
}

export function requiresSelectedPallet(channel: FulfillmentChannel): boolean {
  return channel === "shared_pallet";
}

/**
 * Budbee / Instabee HOME_DELIVERY postal availability applies only to
 * shared_pallet. direct_box must not inherit Budbee eligibility.
 */
export function appliesBudbeeEligibility(channel: FulfillmentChannel): boolean {
  return channel === "shared_pallet";
}

export function countsTowardPalletFill(channel: FulfillmentChannel): boolean {
  return channel === "shared_pallet";
}

/**
 * Explicit carrier binding for direct_box. Absence / incomplete config →
 * fail closed with an honest state (never invent a working route).
 */
export type DirectBoxCarrierConfig = {
  /** Stable id e.g. "instabee_eshipping" — only when contract is known. */
  carrierId: string;
  productCode: string;
  /** ISO countries where this binding is allowed. */
  allowedCountryCodes: string[];
  /** When false, treat as contract present but not ready to quote. */
  quotingEnabled: boolean;
};

export type CarrierEligibilityState =
  | {
      status: "eligible";
      channel: FulfillmentChannel;
      carrierId: string;
      productCode: string;
    }
  | {
      status: "unavailable";
      channel: FulfillmentChannel;
      reason:
        | "carrier_unconfigured"
        | "quoting_disabled"
        | "country_unsupported"
        | "postal_ineligible"
        | "channel_disabled";
      /** i18n message key — UI must show honest copy, not a fake quote. */
      messageKey: string;
    }
  | {
      status: "not_quoted";
      channel: FulfillmentChannel;
      reason: "pending_contract" | "quote_pending";
      messageKey: string;
    };

export function resolveSharedPalletBudbeeEligibility(input: {
  channel: FulfillmentChannel;
  /** Result of Instabee availability for Budbee HOME_DELIVERY (shared_pallet only). */
  budbeeAvailable: boolean | null;
}): CarrierEligibilityState {
  if (input.channel !== "shared_pallet") {
    return {
      status: "unavailable",
      channel: input.channel,
      reason: "channel_disabled",
      messageKey: "checkout.carrierChannelMismatch",
    };
  }
  if (input.budbeeAvailable === false) {
    return {
      status: "unavailable",
      channel: "shared_pallet",
      reason: "postal_ineligible",
      messageKey: "checkout.budbeeUnavailable",
    };
  }
  // null = not checked yet / fail-open advisory in today’s UI — treat as
  // eligible for gate purposes; UI may still show pending.
  return {
    status: "eligible",
    channel: "shared_pallet",
    carrierId: "instabee",
    productCode: "HOME_DELIVERY",
  };
}

/**
 * direct_box carrier resolution. Never calls Budbee. Never invents a carrier.
 */
export function resolveDirectBoxCarrierEligibility(input: {
  channel: FulfillmentChannel;
  checkoutEnabled: boolean;
  config: DirectBoxCarrierConfig | null | undefined;
  countryCode?: string | null;
}): CarrierEligibilityState {
  if (input.channel !== "direct_box") {
    return {
      status: "unavailable",
      channel: input.channel,
      reason: "channel_disabled",
      messageKey: "checkout.carrierChannelMismatch",
    };
  }
  if (!input.checkoutEnabled) {
    return {
      status: "unavailable",
      channel: "direct_box",
      reason: "channel_disabled",
      messageKey: "checkout.directBoxNotEnabled",
    };
  }
  const cfg = input.config;
  if (!cfg || !cfg.carrierId.trim() || !cfg.productCode.trim()) {
    return {
      status: "unavailable",
      channel: "direct_box",
      reason: "carrier_unconfigured",
      messageKey: "checkout.directBoxCarrierUnconfigured",
    };
  }
  const cc = String(input.countryCode ?? "")
    .trim()
    .toUpperCase();
  if (
    cc &&
    cfg.allowedCountryCodes.length > 0 &&
    !cfg.allowedCountryCodes.map((c) => c.toUpperCase()).includes(cc)
  ) {
    return {
      status: "unavailable",
      channel: "direct_box",
      reason: "country_unsupported",
      messageKey: "checkout.directBoxCountryUnsupported",
    };
  }
  if (!cfg.quotingEnabled) {
    return {
      status: "not_quoted",
      channel: "direct_box",
      reason: "pending_contract",
      messageKey: "checkout.directBoxNotQuoted",
    };
  }
  return {
    status: "eligible",
    channel: "direct_box",
    carrierId: cfg.carrierId,
    productCode: cfg.productCode,
  };
}

export type DeliveryCompleteInput = {
  channel: FulfillmentChannel;
  hasZoneDeliveryReady: boolean;
  deliveryZoneReady: boolean;
  hasProducerItems: boolean;
  selectedPallet: { id: string } | null | undefined;
  isUsConditional?: boolean;
  hasUsState?: boolean;
  /** Carrier gate for the channel (after resolve*Eligibility). */
  carrier: CarrierEligibilityState;
};

/**
 * Channel-aware deliveryComplete. shared_pallet keeps today’s pallet rule.
 * direct_box never requires selectedPallet; blocks when carrier is not eligible.
 */
export function isDeliveryCompleteForChannel(
  input: DeliveryCompleteInput,
): boolean {
  if (!input.hasZoneDeliveryReady) return false;

  if (input.isUsConditional) {
    if (!input.hasUsState) return false;
    // US conditional remains pallet SetupIntent path today.
    if (input.channel === "shared_pallet") {
      return input.selectedPallet != null;
    }
    return false;
  }

  if (input.channel === "direct_box") {
    if (input.carrier.status !== "eligible") return false;
    return true;
  }

  // shared_pallet — preserve existing behaviour
  if (!input.deliveryZoneReady) return false;
  if (input.hasProducerItems) return input.selectedPallet != null;
  return true;
}

export type ConfirmChannelPersistence = {
  fulfillment_channel: FulfillmentChannel;
  pallet_id: string | null;
  /** Whether bottles should enter PALLET_FILL_STATUSES accounting. */
  countsTowardPalletFill: boolean;
};

/**
 * What confirm must persist. Rejects inventing a pallet for direct_box.
 */
export function resolveConfirmChannelPersistence(input: {
  channel: FulfillmentChannel;
  selectedPalletId: string | null | undefined;
}): ConfirmChannelPersistence | { error: string } {
  if (input.channel === "direct_box") {
    return {
      fulfillment_channel: "direct_box",
      pallet_id: null,
      countsTowardPalletFill: false,
    };
  }
  const palletId =
    typeof input.selectedPalletId === "string"
      ? input.selectedPalletId.trim()
      : "";
  if (!palletId) {
    return { error: "shared_pallet_requires_pallet_id" };
  }
  return {
    fulfillment_channel: "shared_pallet",
    pallet_id: palletId,
    countsTowardPalletFill: true,
  };
}

/** Payment-intent prefetch may run only when channel gates pass. */
export function mayPrefetchPaymentIntent(input: {
  channel: FulfillmentChannel;
  deliveryComplete: boolean;
  selectedPalletId: string | null | undefined;
  carrier: CarrierEligibilityState;
}): boolean {
  if (!input.deliveryComplete) return false;
  if (input.carrier.status !== "eligible") return false;
  if (requiresSelectedPallet(input.channel)) {
    return Boolean(input.selectedPalletId?.trim());
  }
  return true;
}

/**
 * Outbound booking after payment: shared_pallet → Instabee Budbee;
 * direct_box → only if carrier explicitly eligible (never Budbee by default).
 */
export function resolvePostPaymentBookingTarget(input: {
  channel: FulfillmentChannel;
  carrier: CarrierEligibilityState;
}):
  | { action: "book"; carrierId: string; productCode: string }
  | { action: "skip"; reason: string } {
  if (input.carrier.status !== "eligible") {
    return {
      action: "skip",
      reason: `carrier_${input.carrier.status}_${input.carrier.reason}`,
    };
  }
  if (
    input.channel === "shared_pallet" &&
    !appliesBudbeeEligibility(input.channel)
  ) {
    return { action: "skip", reason: "internal_channel_mismatch" };
  }
  return {
    action: "book",
    carrierId: input.carrier.carrierId,
    productCode: input.carrier.productCode,
  };
}

/** Re-export for callers that need fill-accounting exclusion. */
export { isPalletBasedReservation };
