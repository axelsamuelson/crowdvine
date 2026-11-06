/**
 * WIRED POST /api/checkout/confirm for direct_box — actual route handler.
 * Not helper-only coverage.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const getCart = vi.fn();
const resolveActiveGeoZoneForUser = vi.fn();
const resolveAndChargeCheckoutShipping = vi.fn();
const loadDirectBoxCarrierConfigFromEnv = vi.fn();
const findReservationByIdempotencyKey = vi.fn();
const findRecentDuplicateReservation = vi.fn();

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
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "res-new" }, error: null }),
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
      upsert: async () => ({ error: null }),
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

vi.mock("@/lib/checkout/reservation-idempotency", () => ({
  parseIdempotencyKey: (raw: unknown) =>
    typeof raw === "string" && raw.length > 10 ? raw : null,
  findReservationByIdempotencyKey: (...a: unknown[]) =>
    findReservationByIdempotencyKey(...a),
  findRecentDuplicateReservation: (...a: unknown[]) =>
    findRecentDuplicateReservation(...a),
  isUniqueViolation: () => false,
  buildReservationSuccessResponse: (r: { id: string }) => ({
    success: true,
    reservationId: r.id,
  }),
}));

vi.mock("@/lib/b2b-site", () => ({
  isB2BHost: () => false,
  B2B_PRODUCER_ORDERS_ENABLED: true,
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

describe("WIRED POST /api/checkout/confirm (direct_box)", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    getCart.mockReset();
    resolveActiveGeoZoneForUser.mockReset();
    resolveAndChargeCheckoutShipping.mockReset();
    loadDirectBoxCarrierConfigFromEnv.mockReset();
    findReservationByIdempotencyKey.mockReset();
    findRecentDuplicateReservation.mockReset();

    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });
    getCart.mockResolvedValue({
      id: "cart-1",
      totalQuantity: 6,
      lines: [
        {
          quantity: 6,
          source: "producer",
          cost: { totalAmount: { amount: "1200" } },
          merchandise: { id: "w1", product: { producerBoostActive: false } },
        },
      ],
      cost: { totalAmount: { amount: "1200" } },
    });
    resolveActiveGeoZoneForUser.mockResolvedValue({
      geoZoneId: "zone-1",
      marketCode: "SE",
      countryCode: "SE",
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
    findReservationByIdempotencyKey.mockResolvedValue(null);
    findRecentDuplicateReservation.mockResolvedValue(null);
    delete process.env.DIRECT_BOX_CHECKOUT_ENABLED;
  });

  async function postConfirm(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/checkout/confirm/route");
    return POST(
      new Request("http://localhost/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  const baseAddress = {
    fullName: "Test",
    email: "u@example.com",
    phone: "+46700000000",
    street: "Testgatan 1",
    postcode: "11122",
    city: "Stockholm",
    countryCode: "SE",
  };

  it("POST confirm: spoof direct_box while flag OFF → channel_spoof_rejected", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    const res = await postConfirm({
      address: baseAddress,
      fulfillment_channel: "direct_box",
      selectedPalletId: "leftover-pallet",
      stripe_intent_id: "pi_x",
      stripe_intent_type: "payment_intent",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("channel_spoof_rejected");
  });

  it("POST confirm: setup_intent rejected for authorized direct_box", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    const res = await postConfirm({
      address: baseAddress,
      fulfillment_channel: "direct_box",
      selectedPalletId: "leftover-pallet",
      stripe_intent_id: "seti_x",
      stripe_intent_type: "setup_intent",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("direct_box_rejects_deferred_setup");
  });

  it("POST confirm: missing mode-scoped rate → not_quoted before order", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      shippingSek: 99,
      shippingPending: false,
      source: "configured_flat",
      reason: "pact",
      countryCode: "SE",
      rateChannel: "pact",
      fulfillmentMode: "direct_box",
    });
    const res = await postConfirm({
      address: baseAddress,
      fulfillment_channel: "direct_box",
      stripe_intent_id: "pi_x",
      stripe_intent_type: "payment_intent",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("direct_box_not_quoted");
  });

  it("POST confirm: leftover selectedPalletId does not bypass early gate when rate missing", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(null);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    const res = await postConfirm({
      address: baseAddress,
      fulfillment_channel: "direct_box",
      selectedPalletId: "should-not-create-pallet",
      stripe_intent_id: "pi_x",
      stripe_intent_type: "payment_intent",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("direct_box_carrier_unconfigured");
  });
});
