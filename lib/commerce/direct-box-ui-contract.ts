/**
 * Server-derived direct_box checkout UI contract.
 * Safe to pass to the client — no env secrets / carrier credentials.
 * Feature stays default-OFF via isDirectBoxCheckoutEnabled.
 */

import {
  isDirectBoxCheckoutEnabled,
  resolveDirectBoxCarrierEligibility,
  type CarrierEligibilityState,
} from "@/lib/commerce/fulfillment-channel";
import { loadDirectBoxCarrierConfigFromEnv } from "@/lib/commerce/direct-box-carrier-config";

export type DirectBoxUiAvailability = {
  /** Flag ON — radios may be shown. */
  offered: boolean;
  /**
   * True only when carrier config + quoting enabled for country.
   * When false, direct radio is shown (if offered) but not selectable /
   * deliveryComplete stays false for direct_box.
   */
  deliverySelectable: boolean;
  reason:
    | "flag_off"
    | "carrier_unconfigured"
    | "not_quoted"
    | "country_unsupported"
    | "eligible"
    | "channel_disabled";
  /** i18n message key for honest unavailable copy. */
  messageKey: string | null;
};

function reasonFromCarrier(
  state: CarrierEligibilityState,
): DirectBoxUiAvailability["reason"] {
  if (state.status === "eligible") return "eligible";
  if (state.status === "not_quoted") return "not_quoted";
  switch (state.reason) {
    case "carrier_unconfigured":
      return "carrier_unconfigured";
    case "country_unsupported":
      return "country_unsupported";
    case "pending_contract":
    case "quote_pending":
    case "quoting_disabled":
      return "not_quoted";
    case "channel_disabled":
      return "channel_disabled";
    default:
      return "carrier_unconfigured";
  }
}

/**
 * Build UI availability from server env + country (no secrets leaked).
 */
export function buildDirectBoxUiAvailability(input?: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  countryCode?: string | null;
}): DirectBoxUiAvailability {
  const env = input?.env ?? process.env;
  if (!isDirectBoxCheckoutEnabled(env)) {
    return {
      offered: false,
      deliverySelectable: false,
      reason: "flag_off",
      messageKey: null,
    };
  }

  const config = loadDirectBoxCarrierConfigFromEnv(env);
  const carrier = resolveDirectBoxCarrierEligibility({
    channel: "direct_box",
    checkoutEnabled: true,
    config,
    countryCode: input?.countryCode ?? null,
  });

  const reason = reasonFromCarrier(carrier);
  return {
    offered: true,
    deliverySelectable: carrier.status === "eligible",
    reason,
    messageKey: carrier.status === "eligible" ? null : carrier.messageKey,
  };
}
