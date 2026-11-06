import { describe, expect, it } from "vitest";
import {
  assertDirectBoxConfirmIntentBinding,
  assertDirectBoxRejectsDeferredPipeline,
  assertDirectBoxWebhookDispatchIdempotent,
  buildDirectBoxPaymentIntentMetadata,
  DIRECT_BOX_PAYMENT_MODE,
  reservationPersistenceForDirectBox,
} from "@/lib/commerce/direct-box-payment-contract";

describe("direct_box payment contract", () => {
  it("builds PI metadata bound to direct_box with empty pallet_id", () => {
    const meta = buildDirectBoxPaymentIntentMetadata({
      userId: "u1",
      amountOre: 134900,
      shippingSek: 149,
      carrierId: "test_only_carrier",
      carrierProduct: "TEST_DIRECT",
    });
    expect(meta.fulfillment_channel).toBe("direct_box");
    expect(meta.pallet_id).toBe("");
    expect(meta.shipping_rate_channel).toBe("direct_box");
    expect(meta.expected_amount_ore).toBe("134900");
    expect(meta.carrier_id).toBe("test_only_carrier");
  });

  it("rejects deferred setup_intent / pallet pipeline", () => {
    expect(
      assertDirectBoxRejectsDeferredPipeline({
        paymentMode: "setup_intent",
        palletId: null,
      }).ok,
    ).toBe(false);
    expect(
      assertDirectBoxRejectsDeferredPipeline({
        paymentMode: DIRECT_BOX_PAYMENT_MODE,
        palletId: "pal-1",
      }).ok,
    ).toBe(false);
    expect(
      assertDirectBoxRejectsDeferredPipeline({
        paymentMode: DIRECT_BOX_PAYMENT_MODE,
        palletId: null,
      }).ok,
    ).toBe(true);
  });

  it("confirm binding rejects channel/amount tampering", () => {
    const ok = assertDirectBoxConfirmIntentBinding({
      intentType: "payment_intent",
      paymentIntentAmountOre: 134900,
      serverExpectedAmountOre: 134900,
      paymentIntentMetadata: {
        fulfillment_channel: "direct_box",
        pallet_id: "",
        expected_amount_ore: "134900",
        shipping_rate_channel: "direct_box",
      },
      clientChannelRaw: "direct_box",
    });
    expect(ok).toEqual({ ok: true, channel: "direct_box" });

    expect(
      assertDirectBoxConfirmIntentBinding({
        intentType: "setup_intent",
        paymentIntentAmountOre: 134900,
        serverExpectedAmountOre: 134900,
        paymentIntentMetadata: { fulfillment_channel: "direct_box" },
        clientChannelRaw: "direct_box",
      }).ok,
    ).toBe(false);

    const channelTamper = assertDirectBoxConfirmIntentBinding({
      intentType: "payment_intent",
      paymentIntentAmountOre: 134900,
      serverExpectedAmountOre: 134900,
      paymentIntentMetadata: {
        fulfillment_channel: "shared_pallet",
        expected_amount_ore: "134900",
      },
      clientChannelRaw: "direct_box",
    });
    expect(channelTamper.ok).toBe(false);
    if (!channelTamper.ok) expect(channelTamper.code).toBe("channel_tamper_rejected");

    const amountTamper = assertDirectBoxConfirmIntentBinding({
      intentType: "payment_intent",
      paymentIntentAmountOre: 134900,
      serverExpectedAmountOre: 134900,
      paymentIntentMetadata: {
        fulfillment_channel: "direct_box",
        pallet_id: "",
        expected_amount_ore: "134900",
        shipping_rate_channel: "direct_box",
      },
      clientChannelRaw: "direct_box",
      clientClaimedAmountOre: 9900,
    });
    expect(amountTamper.ok).toBe(false);
    if (!amountTamper.ok) expect(amountTamper.code).toBe("amount_tamper_rejected");
  });

  it("webhook idempotency never allows Instabee for direct_box", () => {
    const first = assertDirectBoxWebhookDispatchIdempotent({
      paymentMetadataChannel: "direct_box",
      alreadyDispatched: false,
    });
    expect(first.mayBookInstabee).toBe(false);
    expect(first.mayBookDirectCarrier).toBe(true);

    const retry = assertDirectBoxWebhookDispatchIdempotent({
      paymentMetadataChannel: "direct_box",
      alreadyDispatched: true,
    });
    expect(retry.mayBookInstabee).toBe(false);
    expect(retry.mayBookDirectCarrier).toBe(false);
    expect(retry.reason).toBe("already_dispatched_idempotent_skip");
  });

  it("persistence shape clears pallet; channel column optional until migration", () => {
    expect(reservationPersistenceForDirectBox({ persistChannelColumn: false })).toEqual({
      pallet_id: null,
      countsTowardPalletFill: false,
    });
    expect(reservationPersistenceForDirectBox({ persistChannelColumn: true })).toEqual({
      fulfillment_channel: "direct_box",
      pallet_id: null,
      countsTowardPalletFill: false,
    });
  });
});
