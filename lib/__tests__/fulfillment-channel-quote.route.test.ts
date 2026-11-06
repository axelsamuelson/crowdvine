/**
 * WIRED POST /api/checkout/quote — mode-scoped shipping (actual route).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getCart = vi.fn();
const resolveActiveGeoZoneForUser = vi.fn();
const resolveAndChargeCheckoutShipping = vi.fn();
const loadDirectBoxCarrierConfigFromEnv = vi.fn();
const getRedeemableBalance = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "pallet-1",
              name: "P",
              cost_cents: 9900,
              bottle_capacity: 600,
              last_mile_cost_cents_per_bottle: 0,
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/src/lib/cart-service", () => ({
  CartService: { getCart: () => getCart() },
}));

vi.mock("@/lib/market/resolve-active-geo-zone", () => ({
  resolveActiveGeoZoneForUser: (...a: unknown[]) =>
    resolveActiveGeoZoneForUser(...a),
}));

vi.mock("@/lib/checkout/resolve-checkout-shipping", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/checkout/resolve-checkout-shipping")
  >("@/lib/checkout/resolve-checkout-shipping");
  return {
    ...actual,
    resolveAndChargeCheckoutShipping: (...a: unknown[]) =>
      resolveAndChargeCheckoutShipping(...a),
  };
});

vi.mock("@/lib/commerce/direct-box-carrier-config", () => ({
  loadDirectBoxCarrierConfigFromEnv: (...a: unknown[]) =>
    loadDirectBoxCarrierConfigFromEnv(...a),
}));

vi.mock("@/lib/membership/pact-points-engine", () => ({
  getRedeemableBalance: (...a: unknown[]) => getRedeemableBalance(...a),
}));

const DIRECT_CARRIER = {
  carrierId: "test_only_carrier",
  productCode: "TEST_DIRECT",
  allowedCountryCodes: ["SE"],
  quotingEnabled: true,
};

const DIRECT_RATE = {
  shippingSek: 149,
  shippingPending: false,
  source: "configured_flat" as const,
  reason: "test-only",
  countryCode: "SE",
  rateChannel: "direct_box" as const,
  fulfillmentMode: "direct_box" as const,
};

const PACT_RATE = {
  shippingSek: 99,
  shippingPending: false,
  source: "configured_flat" as const,
  reason: "pact",
  countryCode: "SE",
  rateChannel: "pact" as const,
  fulfillmentMode: "shared_pallet" as const,
};

describe("WIRED POST /api/checkout/quote (mode-scoped)", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    getCart.mockReset();
    resolveActiveGeoZoneForUser.mockReset();
    resolveAndChargeCheckoutShipping.mockReset();
    loadDirectBoxCarrierConfigFromEnv.mockReset();
    getRedeemableBalance.mockReset();

    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });
    getCart.mockResolvedValue({
      id: "cart-1",
      totalQuantity: 6,
      lines: [
        {
          quantity: 6,
          cost: { totalAmount: { amount: "1200" } },
          merchandise: { product: { producerBoostActive: false } },
        },
      ],
      cost: { totalAmount: { amount: "1200" } },
    });
    resolveActiveGeoZoneForUser.mockResolvedValue({
      countryCode: "SE",
      geoZoneId: "z1",
      marketCode: "SE",
      regionCode: null,
      city: "Stockholm",
      displayName: "Stockholm",
      zoneType: "city",
      eligibilityStatus: "open",
      currencyCode: "SEK",
      defaultDeliveryZoneId: "dz-1",
      source: "profile",
      canStartCampaign: true,
      canReserveConditionally: false,
      canCheckoutNormally: true,
    });
    getRedeemableBalance.mockResolvedValue(0);
    delete process.env.DIRECT_BOX_CHECKOUT_ENABLED;
  });

  async function postQuote(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/checkout/quote/route");
    return POST(
      new Request("http://localhost/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("shared_pallet quote uses pact rate when pallet present", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    resolveAndChargeCheckoutShipping.mockResolvedValue(PACT_RATE);
    const res = await postQuote({
      fulfillment_channel: "shared_pallet",
      pallet_id: "pallet-1",
      country_code: "SE",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quote.fulfillment_channel).toBe("shared_pallet");
    expect(json.quote.rate_channel).toBe("pact");
    expect(json.quote.shipping_sek).toBe(99);
    expect(json.quote.total_sek).toBe(1299);
    expect(resolveAndChargeCheckoutShipping).toHaveBeenCalledWith(
      expect.objectContaining({ fulfillmentMode: "shared_pallet" }),
    );
  });

  it("direct_box quote uses mode-scoped fee — never pact 99", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    const res = await postQuote({
      fulfillment_channel: "direct_box",
      pallet_id: "leftover-pallet",
      country_code: "SE",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quote.fulfillment_channel).toBe("direct_box");
    expect(json.quote.rate_channel).toBe("direct_box");
    expect(json.quote.shipping_sek).toBe(149);
    expect(json.quote.shipping_sek).not.toBe(99);
    expect(json.quote.total_sek).toBe(1349);
    expect(resolveAndChargeCheckoutShipping).toHaveBeenCalledWith(
      expect.objectContaining({ fulfillmentMode: "direct_box", pallet: null }),
    );
  });

  it("direct_box with only pact rate available → not_quoted (no 99 fallback)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      ...PACT_RATE,
      fulfillmentMode: "direct_box",
    });
    const res = await postQuote({
      fulfillment_channel: "direct_box",
      country_code: "SE",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("direct_box_not_quoted");
  });

  it("direct_box flag OFF → channel_spoof_rejected", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    const res = await postQuote({
      fulfillment_channel: "direct_box",
      country_code: "SE",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("channel_spoof_rejected");
  });

  it("cross-channel race: sequential shared then direct returns distinct totals", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);

    resolveAndChargeCheckoutShipping.mockResolvedValueOnce(PACT_RATE);
    const shared = await postQuote({
      fulfillment_channel: "shared_pallet",
      pallet_id: "pallet-1",
      country_code: "SE",
    });
    const sharedJson = await shared.json();

    resolveAndChargeCheckoutShipping.mockResolvedValueOnce(DIRECT_RATE);
    const direct = await postQuote({
      fulfillment_channel: "direct_box",
      country_code: "SE",
    });
    const directJson = await direct.json();

    expect(sharedJson.quote.shipping_sek).toBe(99);
    expect(directJson.quote.shipping_sek).toBe(149);
    expect(sharedJson.quote.total_ore).not.toBe(directJson.quote.total_ore);
  });
});
