/**
 * Wired shared-pallet payment-intent route tests — local mocks only.
 *
 * Models real Stripe Idempotency-Key behavior: create() returns the original
 * cached create body (often still RPM), while retrieve()/list report live
 * status. Asserts no stale client_secret handoff and no sibling create.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { US_CONDITIONAL_TERMS_VERSION } from "@/lib/countries";
import {
  buildSharedPalletIntentMetadata,
  buildSharedPalletStripeIdempotencyKey,
  resetSharedPalletIntentFlightsForTests,
  type SharedPalletIntentContext,
} from "@/lib/checkout/shared-pallet-intent-idempotency";

const getCurrentUser = vi.fn();
const getCart = vi.fn();
const paymentIntentsCreate = vi.fn();
const paymentIntentsList = vi.fn();
const paymentIntentsRetrieve = vi.fn();
const setupIntentsCreate = vi.fn();
const setupIntentsList = vi.fn();
const setupIntentsRetrieve = vi.fn();
const resolveActiveGeoZoneForUser = vi.fn();
const resolveMarketForCountry = vi.fn();
const getRedeemableBalance = vi.fn();
const getOrCreateStripeCustomer = vi.fn();
const resolveAndChargeCheckoutShipping = vi.fn();
const sumReservedBottlesOnPallet = vi.fn();
const determineZones = vi.fn();

const PALLET_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1";
const CART_ID = "cart-shared-1";
const USER_ID = "user-1";
const CUSTOMER_ID = "cus_shared";

let zoneAddressRow: Record<string, unknown> = {
  id: "uza-1",
  user_id: USER_ID,
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
};

let palletRow: Record<string, unknown> = {
  id: PALLET_ID,
  name: "Test pallet",
  status: "shipping_ordered",
  bottle_capacity: 600,
  cost_cents: 0,
  last_mile_cost_cents_per_bottle: 0,
  delivery_zone_id: "dz-1",
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

function makeThenableQuery(data: unknown = null, count = 0) {
  const result = { data, error: null, count };
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    in: () => query,
    is: () => query,
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
      if (table === "pallets") return makeThenableQuery(palletRow);
      if (table === "user_zone_addresses") {
        return makeThenableQuery(zoneAddressRow);
      }
      if (table === "profiles") return makeThenableQuery({ id: USER_ID });
      return makeThenableQuery(null);
    },
  }),
}));

vi.mock("@/lib/pallet-fill-count", () => ({
  sumReservedBottlesOnPallet: (...args: unknown[]) =>
    sumReservedBottlesOnPallet(...args),
}));

vi.mock("@/lib/zone-matching", () => ({
  determineZones: (...args: unknown[]) => determineZones(...args),
}));

vi.mock("@/lib/membership/pact-points-engine", () => ({
  getRedeemableBalance: (...args: unknown[]) => getRedeemableBalance(...args),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: (...args: unknown[]) => paymentIntentsCreate(...args),
      list: (...args: unknown[]) => paymentIntentsList(...args),
      retrieve: (...args: unknown[]) => paymentIntentsRetrieve(...args),
    },
    setupIntents: {
      create: (...args: unknown[]) => setupIntentsCreate(...args),
      list: (...args: unknown[]) => setupIntentsList(...args),
      retrieve: (...args: unknown[]) => setupIntentsRetrieve(...args),
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
  legacyMarketModeFromResolved: (market: { checkoutMode?: string }) =>
    market?.checkoutMode === "conditional_reservation"
      ? "conditional_reservation"
      : "open",
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

function expectedPiContext(amountOre: number): SharedPalletIntentContext {
  return {
    sessionUserId: USER_ID,
    cartId: CART_ID,
    palletId: PALLET_ID,
    expectedAmountOre: amountOre,
    currency: "sek",
    stripeCustomerId: CUSTOMER_ID,
    pactPointsRedeem: 0,
    promoDiscountSek: 0,
    voucherDiscountSek: 0,
    ageVerifiedDob: "1990-01-01",
    ageVerificationMethod: "self_declared_dob",
    purchaseTermsVersion: LEGAL_VERSIONS.terms,
    usConditional: false,
    usRegion: null,
    usConditionalTermsVersion: null,
    checkoutGeneration: 0,
  };
}

function rpmCreateBody(id: string, amountOre: number, secret: string) {
  const ctx = expectedPiContext(amountOre);
  return {
    id,
    status: "requires_payment_method",
    client_secret: secret,
    amount: amountOre,
    currency: "sek",
    customer: CUSTOMER_ID,
    payment_method: null,
    metadata: buildSharedPalletIntentMetadata(ctx),
  };
}

describe("WIRED shared-pallet PI fresh-retrieve fail-closed", () => {
  beforeEach(() => {
    vi.resetModules();
    resetSharedPalletIntentFlightsForTests();
    getCurrentUser.mockReset();
    getCart.mockReset();
    paymentIntentsCreate.mockReset();
    paymentIntentsList.mockReset();
    paymentIntentsRetrieve.mockReset();
    setupIntentsCreate.mockReset();
    setupIntentsList.mockReset();
    setupIntentsRetrieve.mockReset();
    resolveActiveGeoZoneForUser.mockReset();
    resolveMarketForCountry.mockReset();
    getRedeemableBalance.mockReset();
    getOrCreateStripeCustomer.mockReset();
    resolveAndChargeCheckoutShipping.mockReset();
    sumReservedBottlesOnPallet.mockReset();
    determineZones.mockReset();

    getCurrentUser.mockResolvedValue({ id: USER_ID, email: "u@example.com" });
    getCart.mockResolvedValue({
      id: CART_ID,
      lines: [
        {
          quantity: 6,
          cost: { totalAmount: { amount: "900" } },
          merchandise: { product: { producerBoostActive: false } },
        },
      ],
      cost: { totalAmount: { amount: "900" } },
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
    getOrCreateStripeCustomer.mockResolvedValue(CUSTOMER_ID);
    sumReservedBottlesOnPallet.mockResolvedValue(100);
    determineZones.mockResolvedValue({
      deliveryZoneId: "dz-1",
      pallets: [{ id: PALLET_ID }],
      noDeliveryZone: null,
    });
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      shippingSek: 99,
      shippingPending: false,
      source: "configured_flat",
      reason: "test",
      countryCode: "SE",
      rateChannel: "pact",
      fulfillmentMode: "shared_pallet",
    });
    paymentIntentsList.mockResolvedValue({ data: [] });
    setupIntentsList.mockResolvedValue({ data: [] });

    zoneAddressRow = {
      id: "uza-1",
      user_id: USER_ID,
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
    };
    palletRow = {
      id: PALLET_ID,
      name: "Test pallet",
      status: "shipping_ordered",
      bottle_capacity: 600,
      cost_cents: 0,
      last_mile_cost_cents_per_bottle: 0,
      delivery_zone_id: "dz-1",
    };

    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    delete process.env.DIRECT_BOX_CHECKOUT_ENABLED;
    delete process.env.CHECKOUT_DUAL_OFFER_COMPARE;
  });

  async function postPaymentIntent(body: Record<string, unknown> = {}) {
    const { POST } = await import("@/app/api/checkout/payment-intent/route");
    return POST(
      new Request("http://localhost/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: PALLET_ID,
          dateOfBirth: "1990-01-01",
          acceptedTermsVersion: LEGAL_VERSIONS.terms,
          ...body,
        }),
      }),
    );
  }

  it("stable create: create cache RPM + retrieve RPM returns fresh secret", async () => {
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) =>
        rpmCreateBody("pi_new", Number(params.amount), "sec_create_cache"),
    );
    paymentIntentsRetrieve.mockImplementation(async (id: string) =>
      rpmCreateBody(id, 99900, "sec_fresh_retrieve"),
    );

    const res = await postPaymentIntent();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.intentId).toBe("pi_new");
    expect(json.clientSecret).toBe("sec_fresh_retrieve");
    expect(json.clientSecret).not.toBe("sec_create_cache");
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(paymentIntentsRetrieve).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["succeeded", "pm_paid"],
    ["canceled", null],
  ] as const)(
    "create returns cached RPM while retrieve is %s → supersede sibling create (not 409)",
    async (liveStatus, pm) => {
      let createCount = 0;
      paymentIntentsCreate.mockImplementation(
        async (params: Record<string, unknown>) => {
          createCount += 1;
          if (createCount === 1) {
            return rpmCreateBody(
              "pi_cached",
              Number(params.amount),
              "sec_STALE_MUST_NOT_RETURN",
            );
          }
          return rpmCreateBody(
            "pi_sibling",
            Number(params.amount),
            "sec_sibling_create",
          );
        },
      );
      paymentIntentsRetrieve.mockImplementation(async (id: string) => {
        if (id === "pi_cached") {
          return {
            ...rpmCreateBody("pi_cached", 99900, "sec_STALE_MUST_NOT_RETURN"),
            status: liveStatus,
            payment_method: pm,
          };
        }
        return rpmCreateBody("pi_sibling", 99900, "sec_sibling_fresh");
      });

      const res = await postPaymentIntent();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.intentId).toBe("pi_sibling");
      expect(json.clientSecret).toBe("sec_sibling_fresh");
      expect(json.clientSecret).not.toBe("sec_STALE_MUST_NOT_RETURN");
      expect(paymentIntentsCreate).toHaveBeenCalledTimes(2);
      expect(paymentIntentsRetrieve).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ["processing", "pm_proc"],
    ["requires_action", "pm_act"],
    ["requires_confirmation", "pm_conf"],
    ["requires_capture", "pm_cap"],
  ] as const)(
    "create returns cached RPM while retrieve is %s → 409, no second create, no stale secret",
    async (liveStatus, pm) => {
      paymentIntentsCreate.mockImplementation(
        async (params: Record<string, unknown>) =>
          rpmCreateBody(
            "pi_cached",
            Number(params.amount),
            "sec_STALE_MUST_NOT_RETURN",
          ),
      );
      paymentIntentsRetrieve.mockImplementation(async () => ({
        ...rpmCreateBody("pi_cached", 99900, "sec_STALE_MUST_NOT_RETURN"),
        status: liveStatus,
        payment_method: pm,
      }));

      const res = await postPaymentIntent();
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe("prior_intent_not_handoffable");
      expect(json.clientSecret).toBeUndefined();
      expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
      expect(paymentIntentsRetrieve).toHaveBeenCalledTimes(1);
    },
  );

  it("list sees same-context succeeded → does not block; creates fresh RPM", async () => {
    const ctx = expectedPiContext(99900);
    paymentIntentsList.mockResolvedValue({
      data: [
        {
          id: "pi_listed_paid",
          status: "succeeded",
          client_secret: "sec_paid",
          amount: 99900,
          currency: "sek",
          customer: CUSTOMER_ID,
          payment_method: "pm_x",
          metadata: buildSharedPalletIntentMetadata(ctx),
        },
      ],
    });
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) =>
        rpmCreateBody("pi_new", Number(params.amount), "sec_new"),
    );
    paymentIntentsRetrieve.mockImplementation(async () =>
      rpmCreateBody("pi_new", 99900, "sec_new"),
    );

    const res = await postPaymentIntent();
    expect(res.status).toBe(200);
    expect(paymentIntentsCreate).toHaveBeenCalled();
    const json = await res.json();
    expect(json.clientSecret).toBe("sec_new");
  });

  it("retrieve failure → 409 fail closed", async () => {
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) =>
        rpmCreateBody("pi_r", Number(params.amount), "sec_c"),
    );
    paymentIntentsRetrieve.mockRejectedValue(new Error("stripe timeout"));

    const res = await postPaymentIntent();
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("intent_retrieve_failed");
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
  });

  it("fresh retrieve missing client_secret → 409 (C)", async () => {
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) =>
        rpmCreateBody("pi_nosec", Number(params.amount), "sec_cache"),
    );
    paymentIntentsRetrieve.mockImplementation(async () => ({
      ...rpmCreateBody("pi_nosec", 99900, "sec_cache"),
      client_secret: null,
    }));

    const res = await postPaymentIntent();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("prior_intent_not_handoffable");
  });

  it("list reuse of open matching PI never creates", async () => {
    const ctx = expectedPiContext(99900);
    paymentIntentsList.mockResolvedValue({
      data: [
        {
          id: "pi_listed",
          status: "requires_payment_method",
          client_secret: "pi_listed_secret",
          amount: 99900,
          currency: "sek",
          customer: CUSTOMER_ID,
          payment_method: null,
          metadata: buildSharedPalletIntentMetadata(ctx),
        },
      ],
    });

    const res = await postPaymentIntent();
    expect(res.status).toBe(200);
    expect((await res.json()).intentId).toBe("pi_listed");
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("concurrent stable retries share one create+retrieve under flight", async () => {
    let creates = 0;
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) => {
        creates += 1;
        await new Promise((r) => setTimeout(r, 30));
        return rpmCreateBody("pi_once", Number(params.amount), "sec_c");
      },
    );
    paymentIntentsRetrieve.mockImplementation(async () =>
      rpmCreateBody("pi_once", 99900, "sec_f"),
    );

    const [a, b] = await Promise.all([
      postPaymentIntent(),
      postPaymentIntent(),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(creates).toBe(1);
    expect((await a.json()).clientSecret).toBe("sec_f");
    expect((await b.json()).clientSecret).toBe("sec_f");
  });

  it("rejects B2C cart below 6 bottles before creating SetupIntent", async () => {
    // Pallet still in deferred SetupIntent phase (not shipping_ordered PI).
    palletRow = {
      ...palletRow,
      status: "filling",
    };
    getCart.mockResolvedValue({
      id: CART_ID,
      totalQuantity: 2,
      lines: [
        {
          quantity: 2,
          cost: { totalAmount: { amount: "300" } },
          merchandise: { product: { producerBoostActive: false } },
        },
      ],
      cost: { totalAmount: { amount: "300" } },
    });

    const res = await postPaymentIntent();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("cart_minimum_not_met");
    expect(String(json.error)).toMatch(/at least 6 bottles/i);
    expect(setupIntentsCreate).not.toHaveBeenCalled();
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });
});

describe("WIRED shared-pallet SI fresh-retrieve + US terms (B)", () => {
  beforeEach(() => {
    vi.resetModules();
    resetSharedPalletIntentFlightsForTests();
    getCurrentUser.mockReset();
    getCart.mockReset();
    paymentIntentsCreate.mockReset();
    paymentIntentsList.mockReset();
    paymentIntentsRetrieve.mockReset();
    setupIntentsCreate.mockReset();
    setupIntentsList.mockReset();
    setupIntentsRetrieve.mockReset();
    resolveActiveGeoZoneForUser.mockReset();
    resolveMarketForCountry.mockReset();
    getRedeemableBalance.mockReset();
    getOrCreateStripeCustomer.mockReset();
    resolveAndChargeCheckoutShipping.mockReset();
    sumReservedBottlesOnPallet.mockReset();
    determineZones.mockReset();

    getCurrentUser.mockResolvedValue({ id: USER_ID, email: "u@example.com" });
    getCart.mockResolvedValue({
      id: CART_ID,
      lines: [
        {
          quantity: 6,
          cost: { totalAmount: { amount: "900" } },
          merchandise: { product: { producerBoostActive: false } },
        },
      ],
      cost: { totalAmount: { amount: "900" } },
    });
    getRedeemableBalance.mockResolvedValue(0);
    getOrCreateStripeCustomer.mockResolvedValue(CUSTOMER_ID);
    sumReservedBottlesOnPallet.mockResolvedValue(10);
    determineZones.mockResolvedValue({
      deliveryZoneId: "dz-us",
      pallets: [{ id: PALLET_ID }],
      noDeliveryZone: null,
    });
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      shippingSek: 99,
      shippingPending: false,
      source: "configured_flat",
      reason: "test",
      countryCode: "US",
      rateChannel: "pact",
      fulfillmentMode: "shared_pallet",
    });
    setupIntentsList.mockResolvedValue({ data: [] });
    paymentIntentsList.mockResolvedValue({ data: [] });
    zoneAddressRow = {
      id: "uza-us",
      user_id: USER_ID,
      geo_zone_id: "zone-us",
      full_name: "Test US",
      phone: "+14155550123",
      email: "t@example.com",
      address_line1: "1 Market St",
      address_line2: null,
      city: "San Francisco",
      postal_code: "94105",
      country_code: "US",
      region_code: "CA",
    };
    palletRow = {
      id: PALLET_ID,
      name: "US pallet",
      status: "open",
      bottle_capacity: 600,
      cost_cents: 0,
      last_mile_cost_cents_per_bottle: 0,
      delivery_zone_id: "dz-us",
    };
    resolveActiveGeoZoneForUser.mockResolvedValue({
      geoZoneId: "zone-us",
      marketCode: "US",
      countryCode: "US",
      regionCode: "CA",
      city: "San Francisco",
      displayName: "California",
      zoneType: "region",
      eligibilityStatus: "conditional",
      currencyCode: "USD",
      defaultDeliveryZoneId: "dz-us",
      source: "profile",
      canStartCampaign: false,
      canReserveConditionally: true,
      canCheckoutNormally: false,
    });
    resolveMarketForCountry.mockResolvedValue({
      countryCode: "US",
      checkoutMode: "conditional_reservation",
      isCheckoutEligible: false,
      isConditionalReservationEligible: true,
      ageMinimum: 21,
      reason: null,
    });

    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
  });

  it("US SI: binds terms_version into metadata+key; create cache vs retrieve attached → 409 no sibling", async () => {
    setupIntentsCreate.mockImplementation(
      async (
        params: Record<string, unknown>,
        opts?: { idempotencyKey?: string },
      ) => ({
        id: "seti_us",
        status: "requires_payment_method",
        client_secret: "seti_STALE",
        payment_method: null,
        metadata: params.metadata,
        _key: opts?.idempotencyKey,
      }),
    );
    setupIntentsRetrieve.mockResolvedValue({
      id: "seti_us",
      status: "requires_payment_method",
      client_secret: "seti_STALE",
      payment_method: "pm_attached",
      metadata: {
        user_id: USER_ID,
        cart_id: CART_ID,
        pallet_id: PALLET_ID,
        expected_amount_ore: "99900",
        reservation_mode: "conditional",
        country_code: "US",
        market_code: "US",
        region: "CA",
        terms_version: US_CONDITIONAL_TERMS_VERSION,
        age_verified_dob: "1990-01-01",
        age_verification_method: "self_declared_dob",
        pact_points_redeem: "0",
        promo_discount_sek: "0",
        voucher_discount_sek: "0",
        stripe_customer_id: CUSTOMER_ID,
        fulfillment_channel: "shared_pallet",
      },
    });

    const { POST } = await import("@/app/api/checkout/payment-intent/route");
    const res = await POST(
      new Request("http://localhost/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: PALLET_ID,
          dateOfBirth: "1990-01-01",
          us_conditional_ack: true,
        }),
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("prior_intent_not_handoffable");
    expect(setupIntentsCreate).toHaveBeenCalledTimes(1);
    const [params, opts] = setupIntentsCreate.mock.calls[0];
    expect(params.metadata.terms_version).toBe(US_CONDITIONAL_TERMS_VERSION);
    const key = opts?.idempotencyKey as string;
    const expectedCtx: SharedPalletIntentContext = {
      sessionUserId: USER_ID,
      cartId: CART_ID,
      palletId: PALLET_ID,
      expectedAmountOre: Number(params.metadata.expected_amount_ore),
      currency: "sek",
      stripeCustomerId: CUSTOMER_ID,
      pactPointsRedeem: 0,
      promoDiscountSek: 0,
      voucherDiscountSek: 0,
      ageVerifiedDob: "1990-01-01",
      ageVerificationMethod: "self_declared_dob",
      purchaseTermsVersion: null,
      usConditional: true,
      usRegion: "CA",
      usConditionalTermsVersion: US_CONDITIONAL_TERMS_VERSION,
      checkoutGeneration: 0,
    };
    expect(key).toBe(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "setup_intent",
        context: expectedCtx,
      }),
    );
    expect(key).not.toBe(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "setup_intent",
        context: {
          ...expectedCtx,
          usConditionalTermsVersion: `${US_CONDITIONAL_TERMS_VERSION}_NEXT`,
        },
      }),
    );
  });

  it("US SI stable: retrieve RPM returns fresh secret", async () => {
    setupIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) => ({
        id: "seti_ok",
        status: "requires_payment_method",
        client_secret: "seti_cache",
        payment_method: null,
        metadata: params.metadata,
      }),
    );
    setupIntentsRetrieve.mockImplementation(async () => ({
      id: "seti_ok",
      status: "requires_payment_method",
      client_secret: "seti_fresh",
      payment_method: null,
      metadata: setupIntentsCreate.mock.calls[0][0].metadata,
    }));

    const { POST } = await import("@/app/api/checkout/payment-intent/route");
    const res = await POST(
      new Request("http://localhost/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: PALLET_ID,
          dateOfBirth: "1990-01-01",
          us_conditional_ack: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentMode).toBe("setup_intent");
    expect(json.clientSecret).toBe("seti_fresh");
  });
});
