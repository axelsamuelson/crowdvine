/**
 * Mocked E2E integration: UI contract → server authorize → payment metadata →
 * persistence shape → fulfillment dispatch. No Stripe/Instabee/DB network.
 */
import { describe, expect, it, vi } from "vitest";
import {
  authorizeFulfillmentRequest,
  buildCheckoutUiChannelContract,
  decideFulfillmentDispatch,
  runMockedFulfillmentPipeline,
  shouldDispatchInstabeeBudbeeHome,
} from "@/lib/commerce/fulfillment-channel-pipeline";
import type { DirectBoxCarrierConfig } from "@/lib/commerce/fulfillment-channel";

const mockDirectCarrier: DirectBoxCarrierConfig = {
  carrierId: "test_only_carrier",
  productCode: "TEST_DIRECT",
  allowedCountryCodes: ["SE"],
  quotingEnabled: true,
};

/** Shared-pallet / pact (legacy 99 SEK) — valid only for shared_pallet. */
const rateSharedPact99 = {
  source: "configured_flat" as const,
  shippingSek: 99,
  rateChannel: "pact" as const,
};
/** Explicit direct_box mode-scoped rate (test-only; not a production price decision). */
const rateDirectScoped = {
  source: "configured_flat" as const,
  shippingSek: 149,
  rateChannel: "direct_box" as const,
};
const rateMissing = {
  source: "missing_config" as const,
  shippingSek: 0,
  rateChannel: null,
};

const envDirectOn = {
  DIRECT_BOX_CHECKOUT_ENABLED: "true",
} as Record<string, string>;

const envDirectOff = {
  DIRECT_BOX_CHECKOUT_ENABLED: "false",
} as Record<string, string>;

describe("UI contract (default-OFF)", () => {
  it("does not offer direct_box when flag unset/false", () => {
    expect(buildCheckoutUiChannelContract({ env: {} }).directBoxOffered).toBe(
      false,
    );
    expect(
      buildCheckoutUiChannelContract({ env: envDirectOff }).directBoxOffered,
    ).toBe(false);
    expect(
      buildCheckoutUiChannelContract({ env: envDirectOff }).defaultChannel,
    ).toBe("shared_pallet");
  });

  it("offers direct_box only when flag true (still not operational claim)", () => {
    expect(
      buildCheckoutUiChannelContract({ env: envDirectOn }).directBoxOffered,
    ).toBe(true);
  });
});

describe("server anti-spoofing / pallet bypass", () => {
  it("rejects client direct_box while flag OFF", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "SE",
      shippingQuote: rateDirectScoped,
      env: envDirectOff,
      directBoxCarrier: mockDirectCarrier,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("channel_spoof_rejected");
  });

  it("rejects shared_pallet without pallet (server enforces; no bypass)", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "shared_pallet",
      selectedPalletId: null,
      countryCode: "SE",
      budbeeAvailable: true,
      shippingQuote: rateSharedPact99,
      env: envDirectOff,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("shared_pallet_requires_pallet");
  });

  it("strips client pallet_id on authorized direct_box persistence", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: "spoof-pallet",
      countryCode: "SE",
      budbeeAvailable: false,
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: mockDirectCarrier,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.persistence.pallet_id).toBeNull();
      expect(r.plan.paymentMetadata.pallet_id).toBeNull();
      expect(r.plan.paymentMetadata.fulfillment_channel).toBe("direct_box");
      expect(r.plan.shippingSek).toBe(149);
    }
  });

  it("direct_box NEVER silently reuses shared-pallet/pact 99 SEK → not_quoted", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "SE",
      shippingQuote: rateSharedPact99,
      env: envDirectOn,
      directBoxCarrier: mockDirectCarrier,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("direct_box_not_quoted");
  });
});

describe("negative: direct mode missing carrier / rate / unsupported country", () => {
  it("fail-closed when carrier unconfigured", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "SE",
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("direct_box_carrier_unconfigured");
  });

  it("fail-closed when quoting disabled (not_quoted)", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "SE",
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: { ...mockDirectCarrier, quotingEnabled: false },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("direct_box_not_quoted");
  });

  it("fail-closed when country unsupported by carrier allowlist", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "FR",
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: mockDirectCarrier,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("direct_box_country_unsupported");
  });

  it("fail-closed when mode-scoped direct_box rate missing → not_quoted", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "SE",
      shippingQuote: rateMissing,
      env: envDirectOn,
      directBoxCarrier: mockDirectCarrier,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorCode).toBe("direct_box_not_quoted");
  });
});

describe("shared mode: pallet required + Budbee isolated", () => {
  it("happy shared path binds payment metadata to shared_pallet + pallet_id", () => {
    const r = authorizeFulfillmentRequest({
      clientChannel: "shared_pallet",
      selectedPalletId: "pal-9",
      countryCode: "SE",
      budbeeAvailable: true,
      shippingQuote: rateSharedPact99,
      env: envDirectOff,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.paymentMetadata).toEqual({
        fulfillment_channel: "shared_pallet",
        pallet_id: "pal-9",
        carrier_id: "instabee",
        carrier_product: "HOME_DELIVERY",
      });
      expect(r.plan.persistence.countsTowardPalletFill).toBe(true);
      expect(r.plan.shippingSek).toBe(99);
    }
  });

  it("Budbee false fails shared authorize; direct ignores Budbee", () => {
    const shared = authorizeFulfillmentRequest({
      clientChannel: "shared_pallet",
      selectedPalletId: "pal-1",
      budbeeAvailable: false,
      shippingQuote: rateSharedPact99,
      env: envDirectOff,
    });
    expect(shared.ok).toBe(false);
    if (!shared.ok) expect(shared.errorCode).toBe("budbee_postal_ineligible");

    const direct = authorizeFulfillmentRequest({
      clientChannel: "direct_box",
      selectedPalletId: null,
      budbeeAvailable: false,
      countryCode: "SE",
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: mockDirectCarrier,
    });
    expect(direct.ok).toBe(true);
  });
});

describe("webhook dispatch: never book direct_box via Instabee Budbee", () => {
  it("shouldDispatchInstabeeBudbeeHome is false for direct_box metadata/row", () => {
    expect(
      shouldDispatchInstabeeBudbeeHome({
        fulfillment_channel: "direct_box",
        pallet_id: null,
      }),
    ).toBe(false);
    expect(
      shouldDispatchInstabeeBudbeeHome({
        paymentMetadataChannel: "direct_box",
        pallet_id: "ignored",
      }),
    ).toBe(false);
  });

  it("legacy shared (null channel + pallet) still dispatches Instabee", () => {
    expect(
      shouldDispatchInstabeeBudbeeHome({
        fulfillment_channel: null,
        pallet_id: "pal-legacy",
      }),
    ).toBe(true);
  });

  it("decideFulfillmentDispatch never returns instabee action for direct_box", () => {
    expect(
      decideFulfillmentDispatch({
        fulfillment_channel: "direct_box",
        pallet_id: null,
        directCarrierEligible: null,
      }),
    ).toEqual({
      action: "skip",
      channel: "direct_box",
      reason: "direct_box_carrier_unconfigured_or_not_quoted",
    });

    expect(
      decideFulfillmentDispatch({
        fulfillment_channel: "direct_box",
        directCarrierEligible: {
          carrierId: "test_only_carrier",
          productCode: "TEST_DIRECT",
        },
      }).action,
    ).toBe("book_configured_direct_carrier");
  });
});

describe("runMockedFulfillmentPipeline E2E", () => {
  it("shared path calls Instabee mock only", async () => {
    const createInstabeeOrder = vi.fn();
    const bookDirectCarrier = vi.fn();
    const out = runMockedFulfillmentPipeline({
      clientChannel: "shared_pallet",
      selectedPalletId: "pal-1",
      budbeeAvailable: true,
      shippingQuote: rateSharedPact99,
      env: envDirectOff,
      createInstabeeOrder,
      bookDirectCarrier,
    });
    expect(out.authorize.ok).toBe(true);
    expect(out.dispatch?.action).toBe("book_instabee_budbee_home");
    expect(out.instabeeCalled).toBe(true);
    expect(createInstabeeOrder).toHaveBeenCalledWith({
      brand: "Budbee",
      product: "HOME_DELIVERY",
    });
    expect(bookDirectCarrier).not.toHaveBeenCalled();
  });

  it("direct path never calls Instabee even if mock provided", () => {
    const createInstabeeOrder = vi.fn();
    const bookDirectCarrier = vi.fn();
    const out = runMockedFulfillmentPipeline({
      clientChannel: "direct_box",
      selectedPalletId: null,
      budbeeAvailable: false,
      countryCode: "SE",
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: mockDirectCarrier,
      createInstabeeOrder,
      bookDirectCarrier,
    });
    expect(out.authorize.ok).toBe(true);
    expect(out.dispatch?.action).toBe("book_configured_direct_carrier");
    expect(out.instabeeCalled).toBe(false);
    expect(createInstabeeOrder).not.toHaveBeenCalled();
    expect(bookDirectCarrier).toHaveBeenCalled();
  });

  it("direct unconfigured skips booking and does not call Instabee", () => {
    const createInstabeeOrder = vi.fn();
    const out = runMockedFulfillmentPipeline({
      clientChannel: "direct_box",
      selectedPalletId: null,
      countryCode: "SE",
      shippingQuote: rateDirectScoped,
      env: envDirectOn,
      directBoxCarrier: null,
      createInstabeeOrder,
    });
    expect(out.authorize.ok).toBe(false);
    expect(out.dispatch).toBeNull();
    expect(createInstabeeOrder).not.toHaveBeenCalled();
  });
});
