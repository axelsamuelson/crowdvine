/**
 * End-to-end fulfillment channel pipeline (UI contract → server auth →
 * payment metadata → persistence → dispatch decision).
 *
 * Technical plumbing only. Operational readiness for direct_box still
 * requires a real carrier contract + env binding — until then fail closed.
 * Default channel remains shared_pallet; DIRECT_BOX_CHECKOUT_ENABLED default OFF.
 */

import {
  type CarrierEligibilityState,
  type DirectBoxCarrierConfig,
  type FulfillmentChannel,
  appliesBudbeeEligibility,
  defaultFulfillmentChannel,
  isDirectBoxCheckoutEnabled,
  parseFulfillmentChannel,
  resolveConfirmChannelPersistence,
  resolveDirectBoxCarrierEligibility,
  resolvePostPaymentBookingTarget,
  resolveSharedPalletBudbeeEligibility,
} from "@/lib/commerce/fulfillment-channel";
import { loadDirectBoxCarrierConfigFromEnv } from "@/lib/commerce/direct-box-carrier-config";
import {
  carrierStateToCheckoutError,
  shippingFeeForPayment,
  type ChannelCheckoutErrorCode,
  type ModeScopedShippingQuoteInput,
} from "@/lib/commerce/fulfillment-channel-checkout";

/** What the checkout UI is allowed to present / submit. */
export type CheckoutUiChannelContract = {
  defaultChannel: FulfillmentChannel;
  directBoxOffered: boolean;
  /** Client may propose a channel; server re-authorizes. */
  clientMayProposeChannel: true;
  requiresPalletForShared: true;
  appliesBudbeeForShared: true;
  appliesBudbeeForDirect: false;
};

export function buildCheckoutUiChannelContract(input?: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): CheckoutUiChannelContract {
  const env = input?.env ?? process.env;
  return {
    defaultChannel: defaultFulfillmentChannel(),
    directBoxOffered: isDirectBoxCheckoutEnabled(env),
    clientMayProposeChannel: true,
    requiresPalletForShared: true,
    appliesBudbeeForShared: true,
    appliesBudbeeForDirect: false,
  };
}

export type PaymentChannelMetadata = {
  fulfillment_channel: FulfillmentChannel;
  pallet_id: string | null;
  carrier_id: string | null;
  carrier_product: string | null;
};

export type AuthorizedFulfillmentPlan = {
  channel: FulfillmentChannel;
  carrier: CarrierEligibilityState;
  persistence: {
    fulfillment_channel: FulfillmentChannel;
    pallet_id: string | null;
    countsTowardPalletFill: boolean;
  };
  paymentMetadata: PaymentChannelMetadata;
  shippingSek: number;
  shippingPending: boolean;
};

export type AuthorizeFulfillmentFailure = {
  ok: false;
  errorCode: ChannelCheckoutErrorCode | "channel_spoof_rejected";
  message: string;
};

export type AuthorizeFulfillmentSuccess = {
  ok: true;
  plan: AuthorizedFulfillmentPlan;
};

/**
 * Server-side authorization. Never trust client channel / pallet alone.
 * - direct_box while flag OFF → reject (no silent coerce that drops pallet)
 * - shared_pallet without pallet → reject (blocks pallet bypass)
 * - direct_box with client pallet_id → stripped (persistence null)
 * - unknown/missing carrier or non-configured rate → fail closed
 * - direct_box NEVER reuses shared-pallet/`pact` (99 SEK) rates → not_quoted
 */
export function authorizeFulfillmentRequest(input: {
  clientChannel?: string | null;
  selectedPalletId?: string | null;
  countryCode?: string | null;
  /** Shared-pallet Budbee availability; ignored for direct_box. */
  budbeeAvailable?: boolean | null;
  shippingQuote: ModeScopedShippingQuoteInput;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  /** Test injection — production uses env loader. */
  directBoxCarrier?: DirectBoxCarrierConfig | null;
}): AuthorizeFulfillmentSuccess | AuthorizeFulfillmentFailure {
  const env = input.env ?? process.env;
  const directEnabled = isDirectBoxCheckoutEnabled(env);
  const parsed = parseFulfillmentChannel(input.clientChannel);
  const channel: FulfillmentChannel = parsed ?? defaultFulfillmentChannel();

  if (parsed === "direct_box" && !directEnabled) {
    return {
      ok: false,
      errorCode: "channel_spoof_rejected",
      message:
        "direct_box proposed by client but DIRECT_BOX_CHECKOUT_ENABLED is off",
    };
  }

  if (channel === "direct_box" && !directEnabled) {
    return {
      ok: false,
      errorCode: "direct_box_disabled",
      message: "direct_box checkout is disabled",
    };
  }

  const carrierConfig =
    input.directBoxCarrier !== undefined
      ? input.directBoxCarrier
      : loadDirectBoxCarrierConfigFromEnv(env);

  const carrier: CarrierEligibilityState =
    channel === "shared_pallet"
      ? resolveSharedPalletBudbeeEligibility({
          channel,
          budbeeAvailable: input.budbeeAvailable ?? null,
        })
      : resolveDirectBoxCarrierEligibility({
          channel,
          checkoutEnabled: directEnabled,
          config: carrierConfig,
          countryCode: input.countryCode,
        });

  // Shared: Budbee false is advisory in today's live UI; for *authorized*
  // payment/confirm we still allow shared to proceed when budbeeAvailable
  // is null/true. When explicitly false, fail closed for this authorize
  // path so negative tests cover isolation (UI may keep advisory separately).
  if (
    channel === "shared_pallet" &&
    carrier.status === "unavailable" &&
    carrier.reason === "postal_ineligible"
  ) {
    return {
      ok: false,
      errorCode: "budbee_postal_ineligible",
      message: "Budbee HOME_DELIVERY not available for postcode",
    };
  }

  if (channel === "direct_box" && carrier.status !== "eligible") {
    const code = carrierStateToCheckoutError(carrier) ?? "direct_box_carrier_unconfigured";
    return {
      ok: false,
      errorCode: code,
      message: `direct_box carrier not ready: ${carrier.status}/${carrier.reason}`,
    };
  }

  if (channel === "shared_pallet") {
    const palletId = String(input.selectedPalletId ?? "").trim();
    if (!palletId) {
      return {
        ok: false,
        errorCode: "shared_pallet_requires_pallet",
        message: "shared_pallet requires selectedPalletId (server enforced)",
      };
    }
  }

  const fee = shippingFeeForPayment(input.shippingQuote, channel);
  if (!fee.ok) {
    const errorCode = fee.errorCode ?? "shipping_fee_pending";
    return {
      ok: false,
      errorCode,
      message:
        errorCode === "direct_box_not_quoted"
          ? "direct_box requires an explicit mode-scoped customer shipping rate (shared-pallet/pact 99 SEK is never reused)"
          : "customer shipping rate not configured/complete",
    };
  }

  const persistenceResult = resolveConfirmChannelPersistence({
    channel,
    selectedPalletId:
      channel === "direct_box" ? null : input.selectedPalletId,
  });
  if ("error" in persistenceResult) {
    return {
      ok: false,
      errorCode: "shared_pallet_requires_pallet",
      message: persistenceResult.error,
    };
  }

  const paymentMetadata: PaymentChannelMetadata = {
    fulfillment_channel: channel,
    pallet_id: persistenceResult.pallet_id,
    carrier_id: carrier.status === "eligible" ? carrier.carrierId : null,
    carrier_product: carrier.status === "eligible" ? carrier.productCode : null,
  };

  return {
    ok: true,
    plan: {
      channel,
      carrier,
      persistence: persistenceResult,
      paymentMetadata,
      shippingSek: fee.shippingSek,
      shippingPending: fee.shippingPending,
    },
  };
}

/**
 * Whether the Stripe webhook may call Instabee Budbee HOME_DELIVERY.
 * direct_box must NEVER book via Instabee Budbee through this path.
 */
export function shouldDispatchInstabeeBudbeeHome(input: {
  fulfillment_channel?: string | null;
  pallet_id?: string | null;
  paymentMetadataChannel?: string | null;
}): boolean {
  const fromRow = parseFulfillmentChannel(input.fulfillment_channel);
  const fromMeta = parseFulfillmentChannel(input.paymentMetadataChannel);
  const channel = fromRow ?? fromMeta;

  if (channel === "direct_box") return false;
  if (channel === "shared_pallet") return true;

  // Legacy rows: channel null/unknown with a pallet → shared_pallet behaviour
  const palletId = String(input.pallet_id ?? "").trim();
  if (palletId) return true;

  // No channel, no pallet — do not invent Instabee booking
  return false;
}

export type FulfillmentDispatchDecision =
  | {
      action: "book_instabee_budbee_home";
      channel: "shared_pallet";
    }
  | {
      action: "book_configured_direct_carrier";
      channel: "direct_box";
      carrierId: string;
      productCode: string;
    }
  | {
      action: "skip";
      channel: FulfillmentChannel | "unknown";
      reason: string;
    };

export function decideFulfillmentDispatch(input: {
  fulfillment_channel?: string | null;
  pallet_id?: string | null;
  paymentMetadata?: PaymentChannelMetadata | null;
  /** Eligible direct carrier from authorize plan / env — never invent. */
  directCarrierEligible?: { carrierId: string; productCode: string } | null;
}): FulfillmentDispatchDecision {
  if (shouldDispatchInstabeeBudbeeHome(input)) {
    return { action: "book_instabee_budbee_home", channel: "shared_pallet" };
  }

  const channel =
    parseFulfillmentChannel(input.fulfillment_channel) ??
    parseFulfillmentChannel(input.paymentMetadata?.fulfillment_channel) ??
    null;

  if (channel === "direct_box") {
    const c = input.directCarrierEligible;
    if (c?.carrierId && c.productCode) {
      return {
        action: "book_configured_direct_carrier",
        channel: "direct_box",
        carrierId: c.carrierId,
        productCode: c.productCode,
      };
    }
    return {
      action: "skip",
      channel: "direct_box",
      reason: "direct_box_carrier_unconfigured_or_not_quoted",
    };
  }

  return {
    action: "skip",
    channel: channel ?? "unknown",
    reason: "no_dispatch_target",
  };
}

/**
 * Mockable end-to-end run for tests: authorize → bind payment meta →
 * persist shape → dispatch decision. No network.
 */
export function runMockedFulfillmentPipeline(input: Parameters<
  typeof authorizeFulfillmentRequest
>[0] & {
  createInstabeeOrder?: (args: unknown) => Promise<void> | void;
  bookDirectCarrier?: (args: {
    carrierId: string;
    productCode: string;
  }) => Promise<void> | void;
}): {
  authorize: AuthorizeFulfillmentSuccess | AuthorizeFulfillmentFailure;
  dispatch: FulfillmentDispatchDecision | null;
  instabeeCalled: boolean;
  directBookCalled: boolean;
} {
  const authorize = authorizeFulfillmentRequest(input);
  if (!authorize.ok) {
    return {
      authorize,
      dispatch: null,
      instabeeCalled: false,
      directBookCalled: false,
    };
  }

  const plan = authorize.plan;
  const directEligible =
    plan.carrier.status === "eligible" && plan.channel === "direct_box"
      ? {
          carrierId: plan.carrier.carrierId,
          productCode: plan.carrier.productCode,
        }
      : null;

  const dispatch = decideFulfillmentDispatch({
    fulfillment_channel: plan.persistence.fulfillment_channel,
    pallet_id: plan.persistence.pallet_id,
    paymentMetadata: plan.paymentMetadata,
    directCarrierEligible: directEligible,
  });

  let instabeeCalled = false;
  let directBookCalled = false;

  if (dispatch.action === "book_instabee_budbee_home") {
    void input.createInstabeeOrder?.({
      brand: "Budbee",
      product: "HOME_DELIVERY",
    });
    instabeeCalled = Boolean(input.createInstabeeOrder);
  } else if (dispatch.action === "book_configured_direct_carrier") {
    void input.bookDirectCarrier?.({
      carrierId: dispatch.carrierId,
      productCode: dispatch.productCode,
    });
    directBookCalled = Boolean(input.bookDirectCarrier);
  }

  // Sanity: shared helpers agree Budbee only on shared
  if (plan.channel === "direct_box" && appliesBudbeeEligibility(plan.channel)) {
    throw new Error("invariant: direct_box must not apply Budbee");
  }

  // Also exercise resolvePostPaymentBookingTarget for parity
  resolvePostPaymentBookingTarget({
    channel: plan.channel,
    carrier: plan.carrier,
  });

  return { authorize, dispatch, instabeeCalled, directBookCalled };
}
