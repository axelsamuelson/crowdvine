/**
 * Direct_box PaymentIntent / confirm binding contracts.
 *
 * Always immediate PaymentIntent — never pallet deferred SetupIntent.
 * Server quote + channel bind on PI metadata; confirm rejects tampering.
 * No invented carrier/price — callers must already have passed the mode-scoped gate.
 */

import {
  parseFulfillmentChannel,
  type FulfillmentChannel,
} from "@/lib/commerce/fulfillment-channel";
import { amountsWithinTolerance } from "@/lib/checkout/expected-amount";

export const DIRECT_BOX_PAYMENT_MODE = "payment_intent" as const;

export type DirectBoxPaymentMetadata = {
  fulfillment_channel: "direct_box";
  /** Always empty — direct_box never enters pallet deferred pipeline. */
  pallet_id: "";
  expected_amount_ore: string;
  shipping_sek: string;
  shipping_rate_channel: "direct_box";
  carrier_id: string;
  carrier_product: string;
  user_id: string;
  pact_points_redeem: string;
  voucher_discount_sek: string;
  promo_discount_sek: string;
};

export function buildDirectBoxPaymentIntentMetadata(input: {
  userId: string;
  amountOre: number;
  shippingSek: number;
  carrierId: string;
  carrierProduct: string;
  pactPointsRedeem?: number;
  voucherDiscountSek?: number;
  promoDiscountSek?: number;
  legalMetadata?: Record<string, string>;
}): Record<string, string> {
  const base: DirectBoxPaymentMetadata = {
    fulfillment_channel: "direct_box",
    pallet_id: "",
    expected_amount_ore: String(Math.max(0, Math.round(input.amountOre))),
    shipping_sek: String(Math.max(0, input.shippingSek)),
    shipping_rate_channel: "direct_box",
    carrier_id: input.carrierId,
    carrier_product: input.carrierProduct,
    user_id: input.userId,
    pact_points_redeem: String(Math.max(0, Math.floor(input.pactPointsRedeem ?? 0))),
    voucher_discount_sek: String(Math.max(0, input.voucherDiscountSek ?? 0)),
    promo_discount_sek: String(Math.max(0, input.promoDiscountSek ?? 0)),
  };
  return { ...base, ...(input.legalMetadata ?? {}) };
}

/** direct_box must never select SetupIntent / deferred card-save. */
export function assertDirectBoxRejectsDeferredPipeline(input: {
  paymentMode: string;
  palletId?: string | null;
}): { ok: true } | { ok: false; code: "direct_box_rejects_deferred_setup"; message: string } {
  if (input.paymentMode !== DIRECT_BOX_PAYMENT_MODE) {
    return {
      ok: false,
      code: "direct_box_rejects_deferred_setup",
      message:
        "direct_box requires immediate payment_intent; pallet deferred setup_intent is blocked",
    };
  }
  if (String(input.palletId ?? "").trim()) {
    return {
      ok: false,
      code: "direct_box_rejects_deferred_setup",
      message: "direct_box must not bind a pallet_id (deferred pallet pipeline blocked)",
    };
  }
  return { ok: true };
}

export type DirectBoxConfirmBindingFailure = {
  ok: false;
  code:
    | "direct_box_rejects_deferred_setup"
    | "channel_tamper_rejected"
    | "amount_tamper_rejected"
    | "amount_mismatch"
    | "direct_box_intent_metadata_invalid";
  message: string;
};

/**
 * Confirm-time bind: server channel + amount win; client/PI tampering rejected.
 */
export function assertDirectBoxConfirmIntentBinding(input: {
  intentType: string | null | undefined;
  paymentIntentAmountOre: number;
  serverExpectedAmountOre: number;
  paymentIntentMetadata?: Record<string, string | undefined> | null;
  /** Channel the client submitted on confirm. */
  clientChannelRaw?: string | null;
  /** Optional client-claimed total (öre); if present must match server. */
  clientClaimedAmountOre?: number | null;
}): { ok: true; channel: "direct_box" } | DirectBoxConfirmBindingFailure {
  if (input.intentType === "setup_intent") {
    return {
      ok: false,
      code: "direct_box_rejects_deferred_setup",
      message:
        "direct_box confirm rejects setup_intent (pallet deferred-charge pipeline)",
    };
  }
  if (input.intentType !== "payment_intent") {
    return {
      ok: false,
      code: "direct_box_intent_metadata_invalid",
      message: "direct_box confirm requires payment_intent",
    };
  }

  const meta = input.paymentIntentMetadata ?? {};
  const metaChannel = parseFulfillmentChannel(meta.fulfillment_channel);
  if (metaChannel !== "direct_box") {
    return {
      ok: false,
      code: "channel_tamper_rejected",
      message:
        "PaymentIntent fulfillment_channel is not direct_box (server binding required)",
    };
  }
  if (String(meta.pallet_id ?? "").trim()) {
    return {
      ok: false,
      code: "direct_box_rejects_deferred_setup",
      message: "PaymentIntent still carries pallet_id; direct_box cannot use pallet pipeline",
    };
  }
  if (meta.shipping_rate_channel && meta.shipping_rate_channel !== "direct_box") {
    return {
      ok: false,
      code: "channel_tamper_rejected",
      message: "PaymentIntent shipping_rate_channel is not direct_box",
    };
  }

  const clientChannel = parseFulfillmentChannel(input.clientChannelRaw);
  if (clientChannel && clientChannel !== "direct_box") {
    return {
      ok: false,
      code: "channel_tamper_rejected",
      message: "Client fulfillment_channel does not match authorized direct_box",
    };
  }

  if (
    input.clientClaimedAmountOre != null &&
    Number.isFinite(input.clientClaimedAmountOre) &&
    !amountsWithinTolerance(
      input.serverExpectedAmountOre,
      Number(input.clientClaimedAmountOre),
    )
  ) {
    return {
      ok: false,
      code: "amount_tamper_rejected",
      message: "Client-claimed amount does not match server quote",
    };
  }

  const metaExpectedRaw =
    typeof meta.expected_amount_ore === "string"
      ? Number(meta.expected_amount_ore)
      : NaN;
  if (
    Number.isFinite(metaExpectedRaw) &&
    !amountsWithinTolerance(input.serverExpectedAmountOre, metaExpectedRaw)
  ) {
    return {
      ok: false,
      code: "amount_mismatch",
      message: "PaymentIntent expected_amount_ore does not match server quote",
    };
  }

  if (
    !amountsWithinTolerance(
      input.serverExpectedAmountOre,
      input.paymentIntentAmountOre,
    )
  ) {
    return {
      ok: false,
      code: "amount_mismatch",
      message: "PaymentIntent amount does not match server quote",
    };
  }

  return { ok: true, channel: "direct_box" };
}

/**
 * Webhook / dispatch: retries must not book Instabee for direct_box,
 * and must not invent a second fulfilment when already skipped/booked.
 */
export function assertDirectBoxWebhookDispatchIdempotent(input: {
  fulfillmentChannel?: string | null;
  paymentMetadataChannel?: string | null;
  alreadyDispatched?: boolean;
  instabeeCallCount?: number;
}): {
  mayBookInstabee: false;
  mayBookDirectCarrier: boolean;
  reason: string;
} {
  const channel =
    parseFulfillmentChannel(input.fulfillmentChannel) ??
    parseFulfillmentChannel(input.paymentMetadataChannel);
  if (channel === "direct_box") {
    if (input.alreadyDispatched) {
      return {
        mayBookInstabee: false,
        mayBookDirectCarrier: false,
        reason: "already_dispatched_idempotent_skip",
      };
    }
    return {
      mayBookInstabee: false,
      mayBookDirectCarrier: true,
      reason: "direct_box_never_instabee",
    };
  }
  return {
    mayBookInstabee: false,
    mayBookDirectCarrier: false,
    reason: "not_direct_box",
  };
}

export function reservationPersistenceForDirectBox(input: {
  /** When migration 277 is applied, callers may persist this column. */
  persistChannelColumn: boolean;
}): {
  fulfillment_channel?: FulfillmentChannel;
  pallet_id: null;
  countsTowardPalletFill: false;
} {
  return {
    ...(input.persistChannelColumn
      ? { fulfillment_channel: "direct_box" as const }
      : {}),
    pallet_id: null,
    countsTowardPalletFill: false,
  };
}
