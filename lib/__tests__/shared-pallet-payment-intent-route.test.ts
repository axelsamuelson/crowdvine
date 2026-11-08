/**
 * Wired shared-pallet payment-intent route tests — local mocks only.
 * Covers Idempotency-Key replay recovery, PI client_secret fail-closed,
 * and US conditional terms version binding.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { US_CONDITIONAL_TERMS_VERSION } from "@/lib/countries";
import {
  buildSharedPalletIntentMetadata,
  buildSharedPalletRecoveryIdempotencyKey,
  buildSharedPalletStripeIdempotencyKey,
  resetSharedPalletIntentFlightsForTests,
  type SharedPalletIntentContext,
} from "@/lib/checkout/shared-pallet-intent-idempotency";

const getCurrentUser = vi.fn();
const getCart = vi.fn();
const paymentIntentsCreate = vi.fn();
const paymentIntentsList = vi.fn();
const setupIntentsCreate = vi.fn();
const setupIntentsList = vi.fn();
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
      if (table === "pallets") {
        return makeThenableQuery(palletRow);
      }
      if (table === "user_zone_addresses") {
        return makeThenableQuery(zoneAddressRow);
      }
      if (table === "profiles") {
        return makeThenableQuery({ id: USER_ID });
      }
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

describe("WIRED shared-pallet payment-intent (idempotency replay)", () => {
  beforeEach(() => {
    vi.resetModules();
    resetSharedPalletIntentFlightsForTests();
    getCurrentUser.mockReset();
    getCart.mockReset();
    paymentIntentsCreate.mockReset();
    paymentIntentsList.mockReset();
    setupIntentsCreate.mockReset();
    setupIntentsList.mockReset();
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
    };
  }

  it("stable create: list miss then Idempotency-Key create returns RPM PI", async () => {
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>, opts?: { idempotencyKey?: string }) => ({
        id: "pi_new",
        status: "requires_payment_method",
        client_secret: "pi_new_secret",
        amount: params.amount,
        currency: params.currency,
        customer: CUSTOMER_ID,
        payment_method: null,
        metadata: params.metadata,
        _key: opts?.idempotencyKey,
      }),
    );

    const res = await postPaymentIntent();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentMode).toBe("payment_intent");
    expect(json.intentId).toBe("pi_new");
    expect(json.clientSecret).toBe("pi_new_secret");
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
    const key = paymentIntentsCreate.mock.calls[0][1]?.idempotencyKey as string;
    expect(key).toMatch(/^sp_payment_intent_v2_/);
  });

  it("list miss + same-key canceled replay recovers with supersedes key (no charge/cancel)", async () => {
    let amountOre = 0;
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>, opts?: { idempotencyKey?: string }) => {
        amountOre = Number(params.amount);
        const ctx = expectedPiContext(amountOre);
        const baseKey = buildSharedPalletStripeIdempotencyKey({
          intentKind: "payment_intent",
          context: ctx,
        });
        const recoveryKey = buildSharedPalletRecoveryIdempotencyKey({
          intentKind: "payment_intent",
          context: ctx,
          supersedesIntentId: "pi_canceled_cached",
        });
        if (opts?.idempotencyKey === baseKey) {
          return {
            id: "pi_canceled_cached",
            status: "canceled",
            client_secret: "pi_canceled_secret",
            amount: amountOre,
            currency: "sek",
            customer: CUSTOMER_ID,
            payment_method: null,
            metadata: buildSharedPalletIntentMetadata(ctx),
          };
        }
        expect(opts?.idempotencyKey).toBe(recoveryKey);
        return {
          id: "pi_recovered",
          status: "requires_payment_method",
          client_secret: "pi_recovered_secret",
          amount: amountOre,
          currency: "sek",
          customer: CUSTOMER_ID,
          payment_method: null,
          metadata: buildSharedPalletIntentMetadata(ctx),
        };
      },
    );

    const res = await postPaymentIntent();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.intentId).toBe("pi_recovered");
    expect(json.clientSecret).toBe("pi_recovered_secret");
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(2);
    const keys = paymentIntentsCreate.mock.calls.map(
      (c) => c[1]?.idempotencyKey as string,
    );
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[1]).toContain("_r_");
  });

  it("list miss + same-key succeeded replay fails closed (no second chargeable PI)", async () => {
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) => {
        const ctx = expectedPiContext(Number(params.amount));
        return {
          id: "pi_succeeded_cached",
          status: "succeeded",
          client_secret: "pi_succeeded_secret",
          amount: params.amount,
          currency: "sek",
          customer: CUSTOMER_ID,
          payment_method: "pm_charged",
          metadata: buildSharedPalletIntentMetadata(ctx),
        };
      },
    );

    const res = await postPaymentIntent();
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("prior_payment_intent_terminal");
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
  });

  it("attached-method replay recovers; concurrent posts share recovery identity", async () => {
    const cache = new Map<string, Record<string, unknown>>();
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>, opts?: { idempotencyKey?: string }) => {
        const key = String(opts?.idempotencyKey || "");
        const hit = cache.get(key);
        if (hit) return hit;
        const ctx = expectedPiContext(Number(params.amount));
        const baseKey = buildSharedPalletStripeIdempotencyKey({
          intentKind: "payment_intent",
          context: ctx,
        });
        let obj: Record<string, unknown>;
        if (key === baseKey) {
          obj = {
            id: "pi_attached",
            status: "requires_payment_method",
            client_secret: "pi_attached_secret",
            amount: params.amount,
            currency: "sek",
            customer: CUSTOMER_ID,
            payment_method: "pm_old",
            metadata: buildSharedPalletIntentMetadata(ctx),
          };
        } else {
          obj = {
            id: "pi_open_after_recover",
            status: "requires_payment_method",
            client_secret: "pi_open_secret",
            amount: params.amount,
            currency: "sek",
            customer: CUSTOMER_ID,
            payment_method: null,
            metadata: buildSharedPalletIntentMetadata(ctx),
          };
        }
        cache.set(key, obj);
        return obj;
      },
    );

    const [a, b] = await Promise.all([
      postPaymentIntent(),
      postPaymentIntent(),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const ja = await a.json();
    const jb = await b.json();
    expect(ja.intentId).toBe("pi_open_after_recover");
    expect(jb.intentId).toBe("pi_open_after_recover");
  });

  it("PI missing client_secret fails closed", async () => {
    paymentIntentsCreate.mockImplementation(
      async (params: Record<string, unknown>) => {
        const ctx = expectedPiContext(Number(params.amount));
        return {
          id: "pi_nosecret",
          status: "requires_payment_method",
          client_secret: null,
          amount: params.amount,
          currency: "sek",
          customer: CUSTOMER_ID,
          payment_method: null,
          metadata: buildSharedPalletIntentMetadata(ctx),
        };
      },
    );

    const res = await postPaymentIntent();
    // Replay guard treats missing secret as recover; recovery also missing → 409
    // OR if somehow returned past guard, route 500 missing_client_secret.
    expect([409, 500]).toContain(res.status);
    const json = await res.json();
    if (res.status === 500) {
      expect(json.code).toBe("missing_client_secret");
    } else {
      expect(json.code).toBe("intent_recovery_unusable");
    }
  });

  it("legitimate list reuse of open matching PI never creates", async () => {
    // amount = 900 wine + 99 shipping = 99900 öre
    const amountOre = 99900;
    const ctx = expectedPiContext(amountOre);
    paymentIntentsList.mockResolvedValue({
      data: [
        {
          id: "pi_listed",
          status: "requires_payment_method",
          client_secret: "pi_listed_secret",
          amount: amountOre,
          currency: "sek",
          customer: CUSTOMER_ID,
          payment_method: null,
          metadata: buildSharedPalletIntentMetadata(ctx),
        },
      ],
    });

    const res = await postPaymentIntent();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.intentId).toBe("pi_listed");
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });
});

describe("WIRED shared-pallet SetupIntent US terms binding", () => {
  beforeEach(() => {
    vi.resetModules();
    resetSharedPalletIntentFlightsForTests();
    getCurrentUser.mockReset();
    getCart.mockReset();
    paymentIntentsCreate.mockReset();
    paymentIntentsList.mockReset();
    setupIntentsCreate.mockReset();
    setupIntentsList.mockReset();
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

  it("US SI create binds terms_version into metadata and Idempotency-Key", async () => {
    setupIntentsCreate.mockImplementation(
      async (
        params: Record<string, unknown>,
        opts?: { idempotencyKey?: string },
      ) => ({
        id: "seti_us",
        status: "requires_payment_method",
        client_secret: "seti_us_secret",
        payment_method: null,
        metadata: params.metadata,
        _key: opts?.idempotencyKey,
      }),
    );

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
    expect(json.intentId).toBe("seti_us");
    expect(setupIntentsCreate).toHaveBeenCalledTimes(1);
    const [params, opts] = setupIntentsCreate.mock.calls[0];
    expect(params.metadata.terms_version).toBe(US_CONDITIONAL_TERMS_VERSION);
    expect(params.metadata.reservation_mode).toBe("conditional");
    expect(params.metadata.region).toBe("CA");
    const key = opts?.idempotencyKey as string;
    expect(key).toMatch(/^sp_setup_intent_v2_/);

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
});
