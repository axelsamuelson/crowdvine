import { describe, expect, it } from "vitest";
import {
  assertDirectBoxConfirmIntentBinding,
  assertDirectBoxRejectsDeferredPipeline,
  assertDirectBoxWebhookDispatchIdempotent,
  buildDirectBoxPaymentIntentMetadata,
  DIRECT_BOX_PAYMENT_MODE,
  reservationPersistenceForDirectBox,
} from "@/lib/commerce/direct-box-payment-contract";

const baseBindOk = {
  intentType: "payment_intent" as const,
  paymentIntentAmountOre: 134900,
  serverExpectedAmountOre: 134900,
  paymentIntentMetadata: {
    fulfillment_channel: "direct_box",
    pallet_id: "",
    expected_amount_ore: "134900",
    shipping_rate_channel: "direct_box",
    user_id: "user-1",
    cart_id: "cart-1",
    stripe_customer_id: "cus_1",
  },
  paymentIntentCustomerId: "cus_1",
  sessionUserId: "user-1",
  serverCartId: "cart-1",
  expectedStripeCustomerId: "cus_1",
  clientChannelRaw: "direct_box",
};

describe("direct_box payment contract", () => {
  it("builds PI metadata with owner/cart/customer identity", () => {
    const meta = buildDirectBoxPaymentIntentMetadata({
      userId: "u1",
      cartId: "cart-1",
      stripeCustomerId: "cus_1",
      amountOre: 134900,
      shippingSek: 149,
      carrierId: "test_only_carrier",
      carrierProduct: "TEST_DIRECT",
    });
    expect(meta.fulfillment_channel).toBe("direct_box");
    expect(meta.pallet_id).toBe("");
    expect(meta.cart_id).toBe("cart-1");
    expect(meta.stripe_customer_id).toBe("cus_1");
    expect(meta.user_id).toBe("u1");
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
        palletId: null,
      }).ok,
    ).toBe(true);
  });

  it("confirm binding rejects channel/amount/owner/cart/customer tampering", () => {
    expect(assertDirectBoxConfirmIntentBinding(baseBindOk)).toEqual({
      ok: true,
      channel: "direct_box",
    });

    expect(
      assertDirectBoxConfirmIntentBinding({
        ...baseBindOk,
        intentType: "setup_intent",
      }).ok,
    ).toBe(false);

    const owner = assertDirectBoxConfirmIntentBinding({
      ...baseBindOk,
      sessionUserId: "other-user",
    });
    expect(owner.ok).toBe(false);
    if (!owner.ok) expect(owner.code).toBe("owner_mismatch");

    const cart = assertDirectBoxConfirmIntentBinding({
      ...baseBindOk,
      serverCartId: "cart-stale",
    });
    expect(cart.ok).toBe(false);
    if (!cart.ok) expect(cart.code).toBe("cart_mismatch");

    const customer = assertDirectBoxConfirmIntentBinding({
      ...baseBindOk,
      paymentIntentCustomerId: "cus_other",
    });
    expect(customer.ok).toBe(false);
    if (!customer.ok) expect(customer.code).toBe("customer_mismatch");

    const amountTamper = assertDirectBoxConfirmIntentBinding({
      ...baseBindOk,
      clientClaimedAmountOre: 9900,
    });
    expect(amountTamper.ok).toBe(false);
    if (!amountTamper.ok) expect(amountTamper.code).toBe("amount_tamper_rejected");
  });

  it("webhook: never Instabee; pending handoff; never invents carrier book", () => {
    const first = assertDirectBoxWebhookDispatchIdempotent({
      paymentMetadataChannel: "direct_box",
      alreadyMarkedPending: false,
    });
    expect(first.mayBookInstabee).toBe(false);
    expect(first.mayBookDirectCarrier).toBe(false);
    expect(first.shouldMarkFulfillmentPending).toBe(true);

    const retry = assertDirectBoxWebhookDispatchIdempotent({
      paymentMetadataChannel: "direct_box",
      alreadyMarkedPending: true,
    });
    expect(retry.shouldMarkFulfillmentPending).toBe(false);
    expect(retry.reason).toBe("already_pending_idempotent_skip");
  });

  it("persistence shape clears pallet; channel column optional", () => {
    expect(
      reservationPersistenceForDirectBox({ persistChannelColumn: true }),
    ).toEqual({
      fulfillment_channel: "direct_box",
      pallet_id: null,
      countsTowardPalletFill: false,
    });
  });
});
