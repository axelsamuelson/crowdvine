/**
 * ROUTE CONTRACT tests — import actual checkout/confirm/payment-intent/webhook
 * handlers. Separate evidence from conceptual helper-pipeline mocks.
 *
 * No live Stripe / Instabee / DB / payments.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const getCurrentUser = vi.fn();
const getCart = vi.fn();
const createInstabeeOrder = vi.fn();
const confirmInstabeePacking = vi.fn();
const sendLabelsEmail = vi.fn();
const constructEvent = vi.fn();
const resolveAndChargeCheckoutShipping = vi.fn();
const loadDirectBoxCarrierConfigFromEnv = vi.fn();
const paymentIntentsCreate = vi.fn();
const paymentIntentsList = vi.fn();
const setupIntentsCreate = vi.fn();
const setupIntentsList = vi.fn();
const resolveActiveGeoZoneForUser = vi.fn();
const resolveMarketForCountry = vi.fn();
const getRedeemableBalance = vi.fn();
const getOrCreateStripeCustomer = vi.fn();
const reservationUpdates = vi.fn();
let webhookReservationRow: Record<string, unknown> = {
  id: "res-1",
  bottles: 6,
  total_sek: 1000,
  producer_id: "prod-1",
  pallet_id: null,
  charge_blocked_reason: null,
  is_test_purchase: false,
  user_id: "user-1",
  user_addresses: {
    full_name: "Test",
    email: "t@example.com",
    phone: "+46700000000",
    address_street: "Street 1",
    address_postcode: "11122",
    address_city: "Stockholm",
    country_code: "SE",
  },
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

function makeThenableQuery(data: unknown = null) {
  const result = { data, error: null };
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    in: () => query,
    update: () => query,
    maybeSingle: async () => result,
    single: async () => result,
    then: (
      resolve: (v: typeof result) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "user_zone_addresses") {
        return makeThenableQuery({
          id: "uza-1",
          user_id: "user-1",
          geo_zone_id: "zone-1",
          full_name: "Test",
          phone: "+46700000000",
          email: "t@example.com",
          address_line1: "Testgatan 1",
          address_line2: null,
          city: "Stockholm",
          postal_code: "11122",
          country_code: "SE",
          region_code: null,
        });
      }
      if (table === "profiles") {
        return makeThenableQuery({ id: "user-1" });
      }
      if (table === "order_reservations") {
        const query: Record<string, unknown> = makeThenableQuery(
          webhookReservationRow,
        );
        query.update = (payload: Record<string, unknown>) => {
          reservationUpdates(payload);
          Object.assign(webhookReservationRow, payload);
          return {
            eq: async () => ({ error: null }),
          };
        };
        return query;
      }
      if (table === "order_reservation_items") {
        return makeThenableQuery([{ quantity: 6 }]);
      }
      return makeThenableQuery(null);
    },
  }),
}));

vi.mock("@/lib/membership/pact-points-engine", () => ({
  confirmPendingRedemption: async () => ({ success: true }),
  getRedeemableBalance: (...args: unknown[]) => getRedeemableBalance(...args),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => constructEvent(...args),
    },
    paymentIntents: {
      create: (...args: unknown[]) => paymentIntentsCreate(...args),
      list: (...args: unknown[]) => paymentIntentsList(...args),
    },
    setupIntents: {
      create: (...args: unknown[]) => setupIntentsCreate(...args),
      list: (...args: unknown[]) => setupIntentsList(...args),
    },
  },
}));

vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: (...args: unknown[]) =>
    getOrCreateStripeCustomer(...args),
}));

vi.mock("@/lib/shopping-context/resolve", () => ({
  resolveShoppingContext: async () => ({
    locale: "sv",
    currency: "SEK",
    countryCode: "SE",
  }),
  stripeCurrencyFromContext: () => "sek",
}));

vi.mock("@/src/lib/cart-service", () => ({
  CartService: {
    getCart: () => getCart(),
  },
}));

vi.mock("@/lib/market/resolve-active-geo-zone", () => ({
  resolveActiveGeoZoneForUser: (...args: unknown[]) =>
    resolveActiveGeoZoneForUser(...args),
}));

vi.mock("@/lib/market/resolve-market", () => ({
  resolveMarketForCountry: (...args: unknown[]) =>
    resolveMarketForCountry(...args),
  legacyMarketModeFromResolved: () => "open",
}));

vi.mock("@/lib/checkout/resolve-checkout-shipping", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/checkout/resolve-checkout-shipping")
  >("@/lib/checkout/resolve-checkout-shipping");
  return {
    ...actual,
    resolveAndChargeCheckoutShipping: (...args: unknown[]) =>
      resolveAndChargeCheckoutShipping(...args),
  };
});

vi.mock("@/lib/commerce/direct-box-carrier-config", () => ({
  loadDirectBoxCarrierConfigFromEnv: (...args: unknown[]) =>
    loadDirectBoxCarrierConfigFromEnv(...args),
}));

vi.mock("@/lib/instabee/home-delivery", () => ({
  createInstabeeOrder: (...args: unknown[]) => createInstabeeOrder(...args),
  confirmInstabeePacking: (...args: unknown[]) =>
    confirmInstabeePacking(...args),
}));

vi.mock("@/lib/email/instabee-labels", () => ({
  sendLabelsEmail: (...args: unknown[]) => sendLabelsEmail(...args),
}));

vi.mock("@/lib/analytics/emit-checkout-completed", () => ({
  emitCheckoutCompletedOnce: vi.fn(),
}));

vi.mock("@/lib/stripe/resolve-payment-method-details", () => ({
  resolvePaymentMethodDetailsFromId: async () => null,
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
  reason: "test-only direct_box rate (not a production price decision)",
  countryCode: "SE",
  rateChannel: "direct_box" as const,
  fulfillmentMode: "direct_box" as const,
};

describe("WIRED ROUTE contracts (payment-intent)", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    getCart.mockReset();
    resolveAndChargeCheckoutShipping.mockReset();
    loadDirectBoxCarrierConfigFromEnv.mockReset();
    paymentIntentsCreate.mockReset();
    paymentIntentsList.mockReset();
    setupIntentsCreate.mockReset();
    setupIntentsList.mockReset();
    resolveActiveGeoZoneForUser.mockReset();
    resolveMarketForCountry.mockReset();
    getRedeemableBalance.mockReset();
    getOrCreateStripeCustomer.mockReset();

    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });
    getCart.mockResolvedValue({
      id: "cart-1",
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
    resolveMarketForCountry.mockResolvedValue({
      countryCode: "SE",
      checkoutMode: "open",
      isCheckoutEligible: true,
      isConditionalReservationEligible: false,
      ageMinimum: 20,
      reason: null,
    });
    getRedeemableBalance.mockResolvedValue(0);
    getOrCreateStripeCustomer.mockResolvedValue("cus_test");
    paymentIntentsList.mockResolvedValue({ data: [] });
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_direct_test",
      client_secret: "pi_direct_test_secret",
      amount: 134900,
      status: "requires_payment_method",
    });

    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    delete process.env.DIRECT_BOX_CHECKOUT_ENABLED;
  });

  async function postPaymentIntent(body: unknown) {
    const { POST } = await import("@/app/api/checkout/payment-intent/route");
    return POST(
      new Request("http://localhost/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("rejects spoofed direct_box when flag OFF (wired route)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    const res = await postPaymentIntent({
      fulfillment_channel: "direct_box",
      pallet_id: "pal-should-not-matter",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("channel_spoof_rejected");
    expect(resolveAndChargeCheckoutShipping).not.toHaveBeenCalled();
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(setupIntentsCreate).not.toHaveBeenCalled();
  });

  it("fails not_quoted when only pact/99 SEK rate would apply (wired route)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      shippingSek: 99,
      shippingPending: false,
      source: "configured_flat",
      reason: "should not be used for direct_box",
      countryCode: "SE",
      rateChannel: "pact",
      fulfillmentMode: "direct_box",
    });

    const res = await postPaymentIntent({
      fulfillment_channel: "direct_box",
      dateOfBirth: "1990-01-01",
      acceptedTermsVersion: LEGAL_VERSIONS.terms,
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("direct_box_not_quoted");
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(setupIntentsCreate).not.toHaveBeenCalled();
  });

  it("fails not_quoted when mode-scoped direct_box rate is missing (wired route)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      shippingSek: 0,
      shippingPending: true,
      source: "missing_config",
      reason: "No active direct_box customer shipping rate configured",
      countryCode: "SE",
      rateChannel: null,
      fulfillmentMode: "direct_box",
    });

    const res = await postPaymentIntent({
      fulfillment_channel: "direct_box",
      dateOfBirth: "1990-01-01",
      acceptedTermsVersion: LEGAL_VERSIONS.terms,
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("direct_box_not_quoted");
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("fails closed before PI when carrier unconfigured (wired route)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(null);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);

    const res = await postPaymentIntent({
      fulfillment_channel: "direct_box",
      dateOfBirth: "1990-01-01",
      acceptedTermsVersion: LEGAL_VERSIONS.terms,
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("direct_box_carrier_unconfigured");
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(setupIntentsCreate).not.toHaveBeenCalled();
  });

  it("POSITIVE direct path: creates payment_intent with mode-scoped amount/metadata; never setup_intent", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);

    const res = await postPaymentIntent({
      fulfillment_channel: "direct_box",
      // leftover pallet must not enter deferred pipeline
      pallet_id: "leftover-pallet",
      dateOfBirth: "1990-01-01",
      acceptedTermsVersion: LEGAL_VERSIONS.terms,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentMode).toBe("payment_intent");
    expect(json.fulfillment_channel).toBe("direct_box");
    expect(json.palletStatus).toBeNull();
    // 1200 wine + 149 shipping = 1349 SEK → 134900 öre
    expect(json.amountInOre).toBe(134900);
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(setupIntentsCreate).not.toHaveBeenCalled();
    expect(setupIntentsList).not.toHaveBeenCalled();

    const createArg = paymentIntentsCreate.mock.calls[0][0];
    expect(createArg.amount).toBe(134900);
    expect(createArg.metadata.fulfillment_channel).toBe("direct_box");
    expect(createArg.metadata.pallet_id).toBe("");
    expect(createArg.metadata.shipping_rate_channel).toBe("direct_box");
    expect(createArg.metadata.shipping_sek).toBe("149");
    expect(createArg.metadata.carrier_id).toBe("test_only_carrier");
    expect(createArg.metadata.expected_amount_ore).toBe("134900");
    expect(createArg.metadata.cart_id).toBe("cart-1");
    expect(createArg.metadata.user_id).toBe("user-1");
    expect(createArg.metadata.stripe_customer_id).toBe("cus_test");
    expect(resolveAndChargeCheckoutShipping).toHaveBeenCalledWith(
      expect.objectContaining({ fulfillmentMode: "direct_box", pallet: null }),
    );
  });

  it("POSITIVE direct path: retries reuse open PI (no duplicate intent)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsList.mockResolvedValue({
      data: [
        {
          id: "pi_existing",
          client_secret: "pi_existing_secret",
          status: "requires_payment_method",
          metadata: {
            fulfillment_channel: "direct_box",
            expected_amount_ore: "134900",
            user_id: "user-1",
          },
        },
      ],
    });

    const res = await postPaymentIntent({
      fulfillment_channel: "direct_box",
      dateOfBirth: "1990-01-01",
      acceptedTermsVersion: LEGAL_VERSIONS.terms,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.intentId).toBe("pi_existing");
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(setupIntentsCreate).not.toHaveBeenCalled();
  });
});

describe("WIRED ROUTE contracts (stripe webhook direct_box pending handoff)", () => {
  beforeEach(() => {
    vi.resetModules();
    constructEvent.mockReset();
    createInstabeeOrder.mockReset();
    confirmInstabeePacking.mockReset();
    sendLabelsEmail.mockReset();
    reservationUpdates.mockReset();
    webhookReservationRow = {
      id: "res-1",
      bottles: 6,
      total_sek: 1000,
      producer_id: "prod-1",
      pallet_id: null,
      charge_blocked_reason: null,
      is_test_purchase: false,
      user_id: "user-1",
      user_addresses: {
        full_name: "Test",
        email: "t@example.com",
        phone: "+46700000000",
        address_street: "Street 1",
        address_postcode: "11122",
        address_city: "Stockholm",
        country_code: "SE",
      },
    };
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.INSTABEE_AUTO_CREATE_ORDERS = "true";
  });

  it("marks DIRECT_BOX_FULFILLMENT_PENDING; never Instabee; retry is idempotent", async () => {
    constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_direct_1",
          metadata: {
            reservation_id: "res-1",
            fulfillment_channel: "direct_box",
            pallet_id: "",
          },
          latest_charge: null,
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const req = () =>
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=test" },
        body: "{}",
      });
    const res1 = await POST(req());
    expect(res1.status).toBe(200);
    expect(createInstabeeOrder).not.toHaveBeenCalled();
    expect(reservationUpdates).toHaveBeenCalledWith(
      expect.objectContaining({
        charge_blocked_reason: "DIRECT_BOX_FULFILLMENT_PENDING",
      }),
    );

    reservationUpdates.mockClear();
    const res2 = await POST(req());
    expect(res2.status).toBe(200);
    expect(createInstabeeOrder).not.toHaveBeenCalled();
    // Idempotent: already pending — no second pending write required
    expect(reservationUpdates).not.toHaveBeenCalledWith(
      expect.objectContaining({
        charge_blocked_reason: "DIRECT_BOX_FULFILLMENT_PENDING",
      }),
    );
  });
});
