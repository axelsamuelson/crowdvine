import { describe, expect, it, vi } from "vitest";
import {
  appliesBudbeeEligibility,
  countsTowardPalletFill,
  defaultFulfillmentChannel,
  isDeliveryCompleteForChannel,
  isDirectBoxCheckoutEnabled,
  mayPrefetchPaymentIntent,
  parseFulfillmentChannel,
  requiresSelectedPallet,
  resolveConfirmChannelPersistence,
  resolveDirectBoxCarrierEligibility,
  resolvePostPaymentBookingTarget,
  resolveSharedPalletBudbeeEligibility,
  type DirectBoxCarrierConfig,
} from "@/lib/commerce/fulfillment-channel";
import {
  carrierStateToCheckoutError,
  shippingFeeForPayment,
  simulateChannelCheckoutFlow,
} from "@/lib/commerce/fulfillment-channel-checkout";
import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";

const configuredDirectCarrier: DirectBoxCarrierConfig = {
  carrierId: "future_contracted_carrier",
  productCode: "DIRECT_HOME",
  allowedCountryCodes: ["SE"],
  quotingEnabled: true,
};

describe("fulfillment channel parsing + gates", () => {
  it("defaults to shared_pallet", () => {
    expect(defaultFulfillmentChannel()).toBe("shared_pallet");
  });

  it("parses channel aliases without inventing unknown modes", () => {
    expect(parseFulfillmentChannel("direct_box")).toBe("direct_box");
    expect(parseFulfillmentChannel("direct-box")).toBe("direct_box");
    expect(parseFulfillmentChannel("shared_pallet")).toBe("shared_pallet");
    expect(parseFulfillmentChannel("eshipping")).toBeNull();
    expect(parseFulfillmentChannel("")).toBeNull();
  });

  it("direct_box checkout stays disabled unless env explicitly true", () => {
    expect(isDirectBoxCheckoutEnabled({})).toBe(false);
    expect(isDirectBoxCheckoutEnabled({ DIRECT_BOX_CHECKOUT_ENABLED: "false" })).toBe(
      false,
    );
    expect(isDirectBoxCheckoutEnabled({ DIRECT_BOX_CHECKOUT_ENABLED: "true" })).toBe(
      true,
    );
  });

  it("isolates pallet + Budbee rules by channel", () => {
    expect(requiresSelectedPallet("shared_pallet")).toBe(true);
    expect(requiresSelectedPallet("direct_box")).toBe(false);
    expect(appliesBudbeeEligibility("shared_pallet")).toBe(true);
    expect(appliesBudbeeEligibility("direct_box")).toBe(false);
    expect(countsTowardPalletFill("shared_pallet")).toBe(true);
    expect(countsTowardPalletFill("direct_box")).toBe(false);
  });
});

describe("deliveryComplete isolation", () => {
  const base = {
    hasZoneDeliveryReady: true,
    deliveryZoneReady: true,
    hasProducerItems: true,
  };

  it("shared_pallet still requires selectedPallet for producer carts", () => {
    const carrier = resolveSharedPalletBudbeeEligibility({
      channel: "shared_pallet",
      budbeeAvailable: true,
    });
    expect(
      isDeliveryCompleteForChannel({
        ...base,
        channel: "shared_pallet",
        selectedPallet: null,
        carrier,
      }),
    ).toBe(false);
    expect(
      isDeliveryCompleteForChannel({
        ...base,
        channel: "shared_pallet",
        selectedPallet: { id: "p1" },
        carrier,
      }),
    ).toBe(true);
  });

  it("direct_box completes without selectedPallet when carrier eligible", () => {
    const carrier = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: configuredDirectCarrier,
      countryCode: "SE",
    });
    expect(carrier.status).toBe("eligible");
    expect(
      isDeliveryCompleteForChannel({
        ...base,
        channel: "direct_box",
        selectedPallet: null,
        carrier,
      }),
    ).toBe(true);
  });

  it("direct_box does not complete when carrier unconfigured", () => {
    const carrier = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: null,
      countryCode: "SE",
    });
    expect(carrier.status).toBe("unavailable");
    expect(
      isDeliveryCompleteForChannel({
        ...base,
        channel: "direct_box",
        selectedPallet: null,
        carrier,
      }),
    ).toBe(false);
  });
});

describe("postcode / carrier branching (mocked — no Instabee)", () => {
  it("shared_pallet maps Budbee false → postal_ineligible; never touches direct config", () => {
    const state = resolveSharedPalletBudbeeEligibility({
      channel: "shared_pallet",
      budbeeAvailable: false,
    });
    expect(state).toMatchObject({
      status: "unavailable",
      reason: "postal_ineligible",
    });
    expect(carrierStateToCheckoutError(state)).toBe("budbee_postal_ineligible");
  });

  it("direct_box ignores Budbee availability entirely", () => {
    const withBudbeeFalse = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: configuredDirectCarrier,
      countryCode: "SE",
    });
    expect(withBudbeeFalse.status).toBe("eligible");
    // Budbee not an input — isolation is structural.
    expect(appliesBudbeeEligibility("direct_box")).toBe(false);
  });

  it("unconfigured direct carrier fails honestly (unavailable, not fake quote)", () => {
    const state = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: null,
      countryCode: "SE",
    });
    expect(state).toEqual({
      status: "unavailable",
      channel: "direct_box",
      reason: "carrier_unconfigured",
      messageKey: "checkout.directBoxCarrierUnconfigured",
    });
  });

  it("quoting_disabled → not_quoted (pending contract), not eligible", () => {
    const state = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: { ...configuredDirectCarrier, quotingEnabled: false },
      countryCode: "SE",
    });
    expect(state.status).toBe("not_quoted");
    expect(carrierStateToCheckoutError(state)).toBe("direct_box_not_quoted");
  });

  it("disabled flag → channel_disabled even if carrier config present", () => {
    const state = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: false,
      config: configuredDirectCarrier,
      countryCode: "SE",
    });
    expect(state).toMatchObject({
      status: "unavailable",
      reason: "channel_disabled",
    });
  });
});

describe("fee / payment / order / fulfillment propagation", () => {
  it("never invents shipping fee — pending configured rate stays pending", () => {
    expect(
      shippingFeeForPayment({
        source: "missing_config",
        shippingSek: 0,
        rateChannel: "pact",
      }),
    ).toEqual({
      shippingSek: 0,
      shippingPending: true,
      ok: false,
      errorCode: "shipping_fee_pending",
    });
    expect(
      shippingFeeForPayment({
        source: "legacy_pallet_amortization",
        shippingSek: 40,
        rateChannel: "pact",
      }),
    ).toEqual({
      shippingSek: 0,
      shippingPending: true,
      ok: false,
      errorCode: "shipping_fee_pending",
    });
    expect(
      shippingFeeForPayment({
        source: "configured_flat",
        shippingSek: 99,
        rateChannel: "pact",
      }),
    ).toEqual({
      shippingSek: 99,
      shippingPending: false,
      ok: true,
      errorCode: null,
    });
  });

  it("direct_box rejects pact/99 SEK reuse → not_quoted", () => {
    expect(
      shippingFeeForPayment(
        {
          source: "configured_flat",
          shippingSek: 99,
          rateChannel: "pact",
        },
        "direct_box",
      ),
    ).toEqual({
      shippingSek: 0,
      shippingPending: true,
      ok: false,
      errorCode: "direct_box_not_quoted",
    });
    expect(
      shippingFeeForPayment(
        {
          source: "configured_flat",
          shippingSek: 149,
          rateChannel: "direct_box",
        },
        "direct_box",
      ),
    ).toEqual({
      shippingSek: 149,
      shippingPending: false,
      ok: true,
      errorCode: null,
    });
  });

  it("direct_box persistence clears pallet_id and fill accounting", () => {
    const p = resolveConfirmChannelPersistence({
      channel: "direct_box",
      selectedPalletId: "should-be-ignored",
    });
    expect(p).toEqual({
      fulfillment_channel: "direct_box",
      pallet_id: null,
      countsTowardPalletFill: false,
    });
    expect(
      isPalletBasedReservation({
        pallet_id: null,
        fulfillment_channel: "direct_box",
      }),
    ).toBe(false);
  });

  it("shared_pallet persistence requires pallet_id", () => {
    expect(
      resolveConfirmChannelPersistence({
        channel: "shared_pallet",
        selectedPalletId: null,
      }),
    ).toEqual({ error: "shared_pallet_requires_pallet_id" });
    expect(
      resolveConfirmChannelPersistence({
        channel: "shared_pallet",
        selectedPalletId: "pallet-1",
      }),
    ).toEqual({
      fulfillment_channel: "shared_pallet",
      pallet_id: "pallet-1",
      countsTowardPalletFill: true,
    });
  });

  it("payment prefetch: direct_box without pallet ok; shared_pallet needs pallet", () => {
    const directCarrier = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: configuredDirectCarrier,
      countryCode: "SE",
    });
    expect(
      mayPrefetchPaymentIntent({
        channel: "direct_box",
        deliveryComplete: true,
        selectedPalletId: null,
        carrier: directCarrier,
      }),
    ).toBe(true);

    const sharedCarrier = resolveSharedPalletBudbeeEligibility({
      channel: "shared_pallet",
      budbeeAvailable: true,
    });
    expect(
      mayPrefetchPaymentIntent({
        channel: "shared_pallet",
        deliveryComplete: true,
        selectedPalletId: null,
        carrier: sharedCarrier,
      }),
    ).toBe(false);
  });

  it("post-payment booking uses channel carrier; skips when unconfigured", () => {
    const eligible = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: configuredDirectCarrier,
      countryCode: "SE",
    });
    expect(
      resolvePostPaymentBookingTarget({
        channel: "direct_box",
        carrier: eligible,
      }),
    ).toEqual({
      action: "book",
      carrierId: "future_contracted_carrier",
      productCode: "DIRECT_HOME",
    });

    const unconfigured = resolveDirectBoxCarrierEligibility({
      channel: "direct_box",
      checkoutEnabled: true,
      config: null,
      countryCode: "SE",
    });
    expect(
      resolvePostPaymentBookingTarget({
        channel: "direct_box",
        carrier: unconfigured,
      }).action,
    ).toBe("skip");
  });
});

describe("simulateChannelCheckoutFlow (mocked externals)", () => {
  const shippingSharedOk = {
    source: "configured_flat" as const,
    shippingSek: 99,
    rateChannel: "pact" as const,
  };
  const shippingDirectOk = {
    source: "configured_flat" as const,
    shippingSek: 149,
    rateChannel: "direct_box" as const,
  };

  it("happy shared_pallet path preserves Budbee + pallet", () => {
    const r = simulateChannelCheckoutFlow({
      channel: "shared_pallet",
      directBoxEnabled: false,
      directBoxCarrier: null,
      countryCode: "SE",
      budbeeAvailable: true,
      selectedPalletId: "pal-1",
      shippingQuote: shippingSharedOk,
    });
    expect(r.stepFailed).toBeNull();
    expect(r.errorCode).toBeNull();
    expect(r.persistence).toMatchObject({
      fulfillment_channel: "shared_pallet",
      pallet_id: "pal-1",
      countsTowardPalletFill: true,
    });
    expect(r.booking).toEqual({
      action: "book",
      carrierId: "instabee",
      productCode: "HOME_DELIVERY",
    });
  });

  it("shared_pallet fails without pallet even if Budbee ok", () => {
    const r = simulateChannelCheckoutFlow({
      channel: "shared_pallet",
      directBoxEnabled: false,
      directBoxCarrier: null,
      countryCode: "SE",
      budbeeAvailable: true,
      selectedPalletId: null,
      shippingQuote: shippingSharedOk,
    });
    expect(r.stepFailed).toBe("delivery_choice");
    expect(r.errorCode).toBe("shared_pallet_requires_pallet");
  });

  it("direct_box with Budbee false still proceeds when carrier configured (isolation)", () => {
    const createOrder = vi.fn();
    const r = simulateChannelCheckoutFlow({
      channel: "direct_box",
      directBoxEnabled: true,
      directBoxCarrier: configuredDirectCarrier,
      countryCode: "SE",
      budbeeAvailable: false,
      selectedPalletId: null,
      shippingQuote: shippingDirectOk,
    });
    expect(r.stepFailed).toBeNull();
    expect(r.persistence).toMatchObject({
      fulfillment_channel: "direct_box",
      pallet_id: null,
      countsTowardPalletFill: false,
    });
    expect(r.booking).toMatchObject({
      action: "book",
      carrierId: "future_contracted_carrier",
    });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("direct_box unconfigured carrier stops at postcode/carrier with honest error", () => {
    const r = simulateChannelCheckoutFlow({
      channel: "direct_box",
      directBoxEnabled: true,
      directBoxCarrier: null,
      countryCode: "SE",
      budbeeAvailable: true,
      selectedPalletId: null,
      shippingQuote: shippingDirectOk,
    });
    expect(r.stepFailed).toBe("postcode_eligibility");
    expect(r.errorCode).toBe("direct_box_carrier_unconfigured");
    expect(r.paymentAllowed).toBe(false);
    expect(r.persistence).toBeNull();
  });

  it("direct_box disabled does not enable fulfilment even with carrier config", () => {
    const r = simulateChannelCheckoutFlow({
      channel: "direct_box",
      directBoxEnabled: false,
      directBoxCarrier: configuredDirectCarrier,
      countryCode: "SE",
      budbeeAvailable: true,
      selectedPalletId: null,
      shippingQuote: shippingDirectOk,
    });
    expect(r.errorCode).toBe("direct_box_disabled");
    expect(r.paymentAllowed).toBe(false);
  });

  it("does not overwrite or invent 99 SEK — pact reuse → not_quoted", () => {
    const missing = simulateChannelCheckoutFlow({
      channel: "direct_box",
      directBoxEnabled: true,
      directBoxCarrier: configuredDirectCarrier,
      countryCode: "SE",
      budbeeAvailable: null,
      selectedPalletId: null,
      shippingQuote: {
        source: "missing_config",
        shippingSek: 99,
        rateChannel: null,
      },
    });
    expect(missing.stepFailed).toBe("shipping_fee");
    expect(missing.errorCode).toBe("direct_box_not_quoted");

    const pactReuse = simulateChannelCheckoutFlow({
      channel: "direct_box",
      directBoxEnabled: true,
      directBoxCarrier: configuredDirectCarrier,
      countryCode: "SE",
      budbeeAvailable: null,
      selectedPalletId: null,
      shippingQuote: shippingSharedOk,
    });
    expect(pactReuse.stepFailed).toBe("shipping_fee");
    expect(pactReuse.errorCode).toBe("direct_box_not_quoted");
  });
});
