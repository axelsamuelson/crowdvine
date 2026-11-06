/**
 * Server-route gates for fulfillment_channel (confirm + payment-intent).
 * Wired by the actual route handlers — keep behaviour here so route contract
 * tests exercise the same code paths the HTTP handlers call.
 *
 * direct_box NEVER reuses shared-pallet/`pact` (legacy 99 SEK) rates.
 */

import { resolveAndChargeCheckoutShipping } from "@/lib/checkout/resolve-checkout-shipping";
import { loadDirectBoxCarrierConfigFromEnv } from "@/lib/commerce/direct-box-carrier-config";
import {
  isDirectBoxCheckoutEnabled,
  parseFulfillmentChannel,
} from "@/lib/commerce/fulfillment-channel";
import {
  authorizeFulfillmentRequest,
  type AuthorizeFulfillmentFailure,
  type AuthorizeFulfillmentSuccess,
} from "@/lib/commerce/fulfillment-channel-pipeline";

export type DirectBoxServerGateFailure = AuthorizeFulfillmentFailure & {
  httpStatus: 400;
};

export type DirectBoxServerGateSuccess = AuthorizeFulfillmentSuccess & {
  httpStatus: 200;
};

/**
 * Confirm / payment-intent shared gate when client proposes direct_box.
 * Flag OFF → channel_spoof_rejected.
 * Missing mode-scoped rate → direct_box_not_quoted (never pact/99 SEK).
 */
export async function gateDirectBoxCheckoutRequest(input: {
  clientChannelRaw?: string | null;
  selectedPalletId?: string | null;
  countryCode?: string | null;
  bottleCount: number;
  productSubtotalSek: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<DirectBoxServerGateSuccess | DirectBoxServerGateFailure> {
  const env = input.env ?? process.env;
  const parsed = parseFulfillmentChannel(input.clientChannelRaw);

  if (parsed !== "direct_box") {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: "channel_spoof_rejected",
      message: "gateDirectBoxCheckoutRequest requires clientChannel=direct_box",
    };
  }

  if (!isDirectBoxCheckoutEnabled(env)) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: "channel_spoof_rejected",
      message:
        "direct_box proposed by client but DIRECT_BOX_CHECKOUT_ENABLED is off",
    };
  }

  const shipping = await resolveAndChargeCheckoutShipping({
    bottleCount: input.bottleCount,
    productSubtotalSek: input.productSubtotalSek,
    deliveryCountry: input.countryCode,
    fulfillmentMode: "direct_box",
    pallet: null,
  });

  const auth = authorizeFulfillmentRequest({
    clientChannel: input.clientChannelRaw,
    selectedPalletId: input.selectedPalletId ?? null,
    countryCode: input.countryCode ?? shipping.countryCode,
    budbeeAvailable: null,
    shippingQuote: {
      source:
        shipping.source === "configured_flat" ||
        shipping.source === "configured_free"
          ? shipping.source
          : "missing_config",
      shippingSek: shipping.shippingSek,
      rateChannel: shipping.rateChannel,
    },
    env,
    directBoxCarrier: loadDirectBoxCarrierConfigFromEnv(env),
  });

  if (!auth.ok) {
    return { ...auth, httpStatus: 400 };
  }
  return { ...auth, httpStatus: 200 };
}
