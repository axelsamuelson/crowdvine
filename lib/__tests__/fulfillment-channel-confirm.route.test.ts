/**
 * WIRED POST /api/checkout/confirm — actual route handler (not helper-only).
 * Covers direct_box positive PI→order insert, binding mismatches, PI idempotency,
 * shared_pallet positive, and fail-closed early gates.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const {
  getCurrentUser,
  getCart,
  clearCart,
  resolveActiveGeoZoneForUser,
  resolveMarketForCountry,
  resolveAndChargeCheckoutShipping,
  loadDirectBoxCarrierConfigFromEnv,
  findOrCreatePalletForRegion,
  resolveShippingRegionForCart,
  updatePickupProducerForPallet,
  paymentIntentsRetrieve,
  paymentIntentsUpdate,
  setupIntentsRetrieve,
  setupIntentsUpdate,
  getOrCreateStripeCustomer,
  determineZones,
  createOrGetOutboundFreightQuote,
  resolveOrCreateMarketDropIdForCheckout,
  store,
  findOrCreateCalls,
} = vi.hoisted(() => {
  const store = {
    reservations: [] as Array<Record<string, unknown>>,
    items: [] as Array<Record<string, unknown>>,
    addresses: [] as Array<Record<string, unknown>>,
    reservationInserts: [] as Array<Record<string, unknown>>,
  };
  return {
    getCurrentUser: vi.fn(),
    getCart: vi.fn(),
    clearCart: vi.fn(),
    resolveActiveGeoZoneForUser: vi.fn(),
    resolveMarketForCountry: vi.fn(),
    resolveAndChargeCheckoutShipping: vi.fn(),
    loadDirectBoxCarrierConfigFromEnv: vi.fn(),
    findOrCreatePalletForRegion: vi.fn(async () => {
      findOrCreateCalls.push("findOrCreatePalletForRegion");
      return { palletId: "pallet-auto", created: true };
    }),
    resolveShippingRegionForCart: vi.fn(async () => ({
      shippingRegionId: "region-1",
      hasMultipleRegions: false,
    })),
    updatePickupProducerForPallet: vi.fn(),
    paymentIntentsRetrieve: vi.fn(),
    paymentIntentsUpdate: vi.fn(),
    setupIntentsRetrieve: vi.fn(),
    setupIntentsUpdate: vi.fn(),
    getOrCreateStripeCustomer: vi.fn(),
    determineZones: vi.fn(),
    createOrGetOutboundFreightQuote: vi.fn(),
    resolveOrCreateMarketDropIdForCheckout: vi.fn(async () => "md-1"),
    store,
    findOrCreateCalls: [] as string[],
  };
});

function makeThenable<T>(data: T, error: unknown = null) {
  const result = { data, error } as {
    data: T;
    error: unknown;
    then: (
      resolve: (v: { data: T; error: unknown }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise<unknown>;
  };
  result.then = (resolve, reject) =>
    Promise.resolve({ data, error }).then(resolve, reject);
  return result;
}

function buildAdminClient() {
  return {
    rpc: async () => ({ data: null, error: null }),
    from(table: string) {
      if (table === "wines") {
        return {
          select: () => ({
            in: async () =>
              makeThenable([
                {
                  id: "w1",
                  producer_id: "prod-1",
                  cost_amount: 50,
                  cost_currency: "SEK",
                  exchange_rate: 1,
                  alcohol_tax_cents: 0,
                  price_includes_vat: true,
                },
              ]),
          }),
        };
      }
      if (table === "user_addresses") {
        return {
          insert: (payload: Record<string, unknown>) => {
            const row = { id: "addr-1", ...payload };
            store.addresses.push(row);
            return {
              select: () => ({
                single: async () => makeThenable(row),
              }),
            };
          },
        };
      }
      if (table === "profiles") {
        return {
          upsert: async () => ({ error: null }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => makeThenable(null),
              single: async () => makeThenable(null),
            }),
          }),
        };
      }
      if (table === "pallets") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: async () => makeThenable([]),
              }),
              maybeSingle: async () =>
                makeThenable({
                  id: "pallet-shared-1",
                  name: "Shared",
                  cost_cents: 9900,
                  bottle_capacity: 600,
                  last_mile_cost_cents_per_bottle: 0,
                  status: "open",
                  status_mode: "auto",
                }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === "order_reservations") {
        const filters: Array<{ op: string; col: string; val: unknown }> = [];
        const query: Record<string, unknown> = {
          select(_cols?: string, _opts?: unknown) {
            return query;
          },
          eq(col: string, val: unknown) {
            filters.push({ op: "eq", col, val });
            return query;
          },
          gte(col: string, val: unknown) {
            filters.push({ op: "gte", col, val });
            return query;
          },
          order() {
            return query;
          },
          limit() {
            return query;
          },
          in() {
            return query;
          },
          neq() {
            return query;
          },
          or() {
            return query;
          },
          insert(payload: Record<string, unknown>) {
            // Simulate idx_order_reservations_payment_intent_id_unique at INSERT.
            const pi = payload.payment_intent_id;
            if (
              typeof pi === "string" &&
              pi &&
              store.reservations.some((r) => r.payment_intent_id === pi)
            ) {
              return {
                select: () => ({
                  single: async () =>
                    makeThenable(null, {
                      code: "23505",
                      message:
                        "duplicate key value violates unique constraint idx_order_reservations_payment_intent_id_unique",
                    }),
                }),
              };
            }
            store.reservationInserts.push({ ...payload });
            const row = {
              id: `res-${store.reservations.length + 1}`,
              created_at: new Date().toISOString(),
              ...payload,
            };
            store.reservations.push(row);
            return {
              select: () => ({
                single: async () => makeThenable({ id: row.id }),
              }),
            };
          },
          update(payload: Record<string, unknown>) {
            return {
              eq: async (col: string, val: unknown) => {
                const row = store.reservations.find(
                  (r) => String(r[col]) === String(val),
                );
                if (row) Object.assign(row, payload);
                // Unique payment_intent_id simulation
                if (
                  payload.payment_intent_id &&
                  store.reservations.filter(
                    (r) =>
                      r.payment_intent_id === payload.payment_intent_id &&
                      r !== row,
                  ).length > 0
                ) {
                  return {
                    error: {
                      code: "23505",
                      message: "duplicate key payment_intent_id",
                    },
                  };
                }
                return { error: null };
              },
              in: async () => ({ error: null }),
            };
          },
          delete: () => ({
            eq: async (col: string, val: unknown) => {
              const idx = store.reservations.findIndex(
                (r) => String(r[col]) === String(val),
              );
              if (idx >= 0) store.reservations.splice(idx, 1);
              return { error: null };
            },
          }),
          maybeSingle: async () => {
            let rows = [...store.reservations];
            for (const f of filters) {
              if (f.op === "eq") {
                rows = rows.filter((r) => String(r[f.col]) === String(f.val));
              }
              if (f.op === "gte" && f.col === "created_at") {
                rows = rows.filter(
                  (r) => String(r.created_at ?? "") >= String(f.val),
                );
              }
            }
            return makeThenable(rows[0] ?? null);
          },
          single: async () => makeThenable(store.reservations[0] ?? null),
          then(
            resolve: (v: { data: unknown; error: null }) => unknown,
            reject?: (e: unknown) => unknown,
          ) {
            return Promise.resolve({
              data: store.reservations,
              error: null,
              count: 0,
            }).then(resolve, reject);
          },
        };
        return query;
      }
      if (table === "order_reservation_items") {
        return {
          insert: async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
            const list = Array.isArray(rows) ? rows : [rows];
            store.items.push(...list);
            return { error: null };
          },
        };
      }
      // Default no-op chain
      const noop: Record<string, unknown> = {};
      const self = () => noop;
      for (const k of [
        "select",
        "eq",
        "neq",
        "in",
        "is",
        "gte",
        "lte",
        "gt",
        "order",
        "limit",
        "or",
        "not",
        "upsert",
        "update",
        "delete",
        "insert",
      ]) {
        noop[k] = (..._a: unknown[]) => {
          if (k === "insert" || k === "upsert" || k === "update" || k === "delete") {
            return {
              eq: async () => ({ error: null }),
              in: async () => ({ error: null }),
              select: () => ({
                single: async () => makeThenable(null),
                maybeSingle: async () => makeThenable(null),
              }),
            };
          }
          return Object.assign(noop, {
            maybeSingle: async () => makeThenable(null),
            single: async () => makeThenable(null),
            then: (
              resolve: (v: { data: null; error: null }) => unknown,
              reject?: (e: unknown) => unknown,
            ) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
          });
        };
      }
      noop.maybeSingle = async () => makeThenable(null);
      noop.single = async () => makeThenable(null);
      return noop;
    },
  };
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
  supabaseServer: async () => buildAdminClient(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => buildAdminClient(),
}));

vi.mock("@/src/lib/cart-service", () => ({
  CartService: {
    getCart: () => getCart(),
    clearCart: () => clearCart(),
  },
}));

vi.mock("@/lib/market/resolve-active-geo-zone", () => ({
  resolveActiveGeoZoneForUser: (...a: unknown[]) =>
    resolveActiveGeoZoneForUser(...a),
}));

vi.mock("@/lib/market/resolve-market", () => ({
  resolveMarketForCountry: (...a: unknown[]) => resolveMarketForCountry(...a),
  legacyMarketModeFromResolved: () => "open",
}));

vi.mock("@/lib/market/get-or-create-market-drop", () => ({
  resolveOrCreateMarketDropIdForCheckout: (...a: unknown[]) =>
    resolveOrCreateMarketDropIdForCheckout(...a),
}));

vi.mock("@/lib/market/resolve-market-drop", () => ({
  assertClientMarketDropIdAllowed: () => ({ ok: true }),
}));

vi.mock("@/lib/zone-matching", () => ({
  determineZones: (...a: unknown[]) => determineZones(...a),
}));

vi.mock("@/lib/pallet-auto-management", () => ({
  findOrCreatePalletForRegion: (...a: unknown[]) =>
    findOrCreatePalletForRegion(...a),
  resolveShippingRegionForCart: (...a: unknown[]) =>
    resolveShippingRegionForCart(...a),
  updatePickupProducerForPallet: (...a: unknown[]) =>
    updatePickupProducerForPallet(...a),
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

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      retrieve: (...a: unknown[]) => paymentIntentsRetrieve(...a),
      update: (...a: unknown[]) => paymentIntentsUpdate(...a),
    },
    setupIntents: {
      retrieve: (...a: unknown[]) => setupIntentsRetrieve(...a),
      update: (...a: unknown[]) => setupIntentsUpdate(...a),
    },
  },
}));

vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: (...a: unknown[]) =>
    getOrCreateStripeCustomer(...a),
}));

vi.mock("@/lib/stripe/resolve-payment-method-details", () => ({
  resolvePaymentMethodDetailsFromId: async () => ({
    payment_method_type: "card",
    payment_method_brand: "visa",
    payment_method_last4: "4242",
  }),
}));

vi.mock("@/lib/outbound-freight-quotes", () => ({
  createOrGetOutboundFreightQuote: (...a: unknown[]) =>
    createOrGetOutboundFreightQuote(...a),
}));

vi.mock("@/lib/pallet-completion", () => ({
  checkPalletCompletion: async () => false,
}));

vi.mock("@/lib/b2b-site", () => ({
  isB2BHost: () => false,
  B2B_PRODUCER_ORDERS_ENABLED: true,
}));

vi.mock("@/lib/membership/pact-points-engine", () => ({
  getRedeemableBalance: async () => 0,
  redeemPactPoints: async () => ({ success: true }),
  awardPactPointsForInviteFirstOrder: async () => ({ success: true }),
  awardPactPointsForOwnOrder: async () => ({ success: true }),
}));

vi.mock("@/lib/membership/points-engine", () => ({
  awardPointsForOwnOrder: async () => ({ success: true }),
  awardPointsForInviteSecondOrder: async () => ({ success: true }),
  checkPalletMilestone: async () => null,
  awardPointsForPalletMilestone: async () => ({ success: true }),
  getBaseIPForBottles: () => 0,
  normalizeMembershipLevel: (x: string) => x,
}));

vi.mock("@/lib/membership/founding-member", () => ({
  applyFoundingMemberDoubleIP: async (n: number) => n,
  checkAndGrantFoundingMember: async () => null,
}));

vi.mock("@/lib/membership/progression-rewards", () => ({
  applyProgressionBuffs: async (n: number) => n,
  checkAndAwardProgressionRewards: async () => null,
}));

vi.mock("@/lib/membership/milestone-vouchers", () => ({
  checkAndMintMilestoneVouchers: async () => null,
}));

vi.mock("@/lib/referral/activate-referral-on-first-order", () => ({
  tryActivateReferralOnFirstOrder: async () => null,
}));

vi.mock("@/lib/analytics/log-user-event-server", () => ({
  logUserEventServer: vi.fn(),
}));

vi.mock("@/lib/analytics/emit-checkout-completed", () => ({
  emitCheckoutCompletedOnce: vi.fn(),
}));

vi.mock("@/lib/analytics/visitor-identity-server", () => ({
  readVisitorIdentityFromCookies: async () => ({
    visitorId: null,
    firstTouch: null,
    countryCode: "SE",
  }),
}));

vi.mock("@/lib/exchange-rate-strict", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/exchange-rate-strict")
  >("@/lib/exchange-rate-strict");
  return {
    ...actual,
    fetchExchangeRateToSekStrict: async () => null,
  };
});

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

const SHARED_RATE = {
  shippingSek: 99,
  shippingPending: false,
  source: "configured_flat" as const,
  reason: "pact",
  countryCode: "SE",
  rateChannel: "pact" as const,
  fulfillmentMode: "shared_pallet" as const,
};

const SUBTOTAL_SEK = 1200;
const DIRECT_SHIPPING_SEK = 149;
const DIRECT_AMOUNT_ORE = Math.round((SUBTOTAL_SEK + DIRECT_SHIPPING_SEK) * 100);
const SHARED_SHIPPING_SEK = 99;
const SHARED_AMOUNT_ORE = Math.round((SUBTOTAL_SEK + SHARED_SHIPPING_SEK) * 100);

const LEGAL_META = {
  age_verified_dob: "1990-01-15",
  age_verification_method: "self_declared_dob",
  purchase_terms_version: LEGAL_VERSIONS.terms,
};

function cartFixture(cartId = "cart-1") {
  return {
    id: cartId,
    totalQuantity: 6,
    lines: [
      {
        id: "line-1",
        quantity: 6,
        source: "producer",
        cost: { totalAmount: { amount: String(SUBTOTAL_SEK) } },
        merchandise: {
          id: "w1",
          product: {
            title: "Test Wine",
            producerBoostActive: false,
            priceRange: { minVariantPrice: { amount: "200" } },
          },
        },
      },
    ],
    cost: { totalAmount: { amount: String(SUBTOTAL_SEK) } },
  };
}

function directPiMetadata(overrides: Record<string, string> = {}) {
  return {
    fulfillment_channel: "direct_box",
    pallet_id: "",
    expected_amount_ore: String(DIRECT_AMOUNT_ORE),
    shipping_sek: String(DIRECT_SHIPPING_SEK),
    shipping_rate_channel: "direct_box",
    carrier_id: DIRECT_CARRIER.carrierId,
    carrier_product: DIRECT_CARRIER.productCode,
    user_id: "user-1",
    cart_id: "cart-1",
    stripe_customer_id: "cus_test",
    ...LEGAL_META,
    ...overrides,
  };
}

describe("WIRED POST /api/checkout/confirm (direct_box + shared_pallet)", () => {
  beforeEach(() => {
    vi.resetModules();
    store.reservations.length = 0;
    store.items.length = 0;
    store.addresses.length = 0;
    store.reservationInserts.length = 0;
    findOrCreateCalls.length = 0;

    getCurrentUser.mockReset();
    getCart.mockReset();
    clearCart.mockReset();
    resolveActiveGeoZoneForUser.mockReset();
    resolveMarketForCountry.mockReset();
    resolveAndChargeCheckoutShipping.mockReset();
    loadDirectBoxCarrierConfigFromEnv.mockReset();
    findOrCreatePalletForRegion.mockClear();
    paymentIntentsRetrieve.mockReset();
    paymentIntentsUpdate.mockReset();
    setupIntentsRetrieve.mockReset();
    setupIntentsUpdate.mockReset();
    getOrCreateStripeCustomer.mockReset();
    determineZones.mockReset();
    createOrGetOutboundFreightQuote.mockReset();
    resolveOrCreateMarketDropIdForCheckout.mockReset();

    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });
    getCart.mockResolvedValue(cartFixture());
    clearCart.mockResolvedValue(undefined);
    getOrCreateStripeCustomer.mockResolvedValue("cus_test");
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
    resolveOrCreateMarketDropIdForCheckout.mockResolvedValue("md-1");
    determineZones.mockResolvedValue({
      pickupZoneId: "pz-1",
      deliveryZoneId: "dz-1",
      noDeliveryZone: null,
    });
    createOrGetOutboundFreightQuote.mockResolvedValue({
      quoteId: null,
      breakdown: {
        currency: "SEK",
        parcelCount: 0,
        actualWeightKg: null,
        volumetricWeightKg: null,
        roundedVolumetricWeightKg: null,
        chargeableWeightKg: null,
        baseAmountCents: null,
        weightIncrementAmountCents: null,
        components: [],
        totalAmountCents: null,
        canCalculate: false,
        incompleteReasons: ["test stub"],
      },
      catalogue: null,
      packaging: null,
      economicallyUsable: false,
      effectiveTotalCents: null,
    });
    paymentIntentsUpdate.mockResolvedValue({});
    setupIntentsUpdate.mockResolvedValue({});
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

  function directConfirmBody(extra: Record<string, unknown> = {}) {
    return {
      address: baseAddress,
      fulfillment_channel: "direct_box",
      selectedPalletId: "leftover-should-be-ignored",
      stripe_intent_id: "pi_direct_ok",
      stripe_intent_type: "payment_intent",
      ...extra,
    };
  }

  it("POST confirm: spoof direct_box while flag OFF → channel_spoof_rejected", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("channel_spoof_rejected");
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: setup_intent rejected for authorized direct_box", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    const res = await postConfirm(
      directConfirmBody({
        stripe_intent_id: "seti_x",
        stripe_intent_type: "setup_intent",
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("direct_box_rejects_deferred_setup");
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: missing mode-scoped rate → not_quoted before order", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue({
      ...DIRECT_RATE,
      shippingSek: 99,
      rateChannel: "pact",
      reason: "pact",
    });
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("direct_box_not_quoted");
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: leftover selectedPalletId does not bypass early gate when carrier missing", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(null);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("direct_box_carrier_unconfigured");
    expect(findOrCreateCalls).toHaveLength(0);
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm POSITIVE: PI → order_reservations with null pallet, channel, pending, server total", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE,
      customer: "cus_test",
      payment_method: "pm_test",
      metadata: directPiMetadata(),
    });

    const res = await postConfirm(directConfirmBody());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.reservationId).toBeTruthy();

    expect(findOrCreateCalls).toHaveLength(0);
    expect(findOrCreatePalletForRegion).not.toHaveBeenCalled();
    expect(store.reservationInserts).toHaveLength(1);

    const inserted = store.reservationInserts[0]!;
    expect(inserted.pallet_id).toBeNull();
    expect(inserted.fulfillment_channel).toBe("direct_box");
    expect(inserted.fulfillment_dispatch_status).toBe("pending_manual_handoff");
    expect(inserted).not.toHaveProperty("charge_blocked_reason");
    // Atomic PI bind at insert (migration 138 unique) — no post-insert attach race.
    expect(inserted.payment_intent_id).toBe("pi_direct_ok");
    expect(inserted.payment_status).toBe("paid");
    // B2C producer groups store merchandise in total_sek; charged shipping is
    // persisted separately (server shipping used for PI amount/binding).
    expect(Number(inserted.total_sek)).toBe(SUBTOTAL_SEK);
    expect(inserted.shipping_revenue_gross_cents).toBe(
      Math.round(DIRECT_SHIPPING_SEK * 100),
    );
    expect(inserted.cart_id).toBe("cart-1");
    expect(inserted.user_id).toBe("user-1");

    const persisted = store.reservations.find((r) => r.id === json.reservationId);
    expect(persisted?.payment_intent_id).toBe("pi_direct_ok");
    expect(persisted?.payment_status).toBe("paid");
    // PI amount included server shipping (binding already enforced this).
    expect(paymentIntentsRetrieve).toHaveBeenCalledWith("pi_direct_ok");
  });

  it("POST confirm: owner mismatch rejected (no order)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE,
      customer: "cus_test",
      payment_method: "pm_test",
      metadata: directPiMetadata({ user_id: "other-user" }),
    });
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("owner_mismatch");
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: stale cart_id rejected (no order)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE,
      customer: "cus_test",
      payment_method: "pm_test",
      metadata: directPiMetadata({ cart_id: "cart-stale" }),
    });
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("cart_mismatch");
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: customer mismatch rejected (no order)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE,
      customer: "cus_other",
      payment_method: "pm_test",
      metadata: directPiMetadata({ stripe_customer_id: "cus_other" }),
    });
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("customer_mismatch");
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: amount mismatch rejected (no order)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE - 5000,
      customer: "cus_test",
      payment_method: "pm_test",
      metadata: directPiMetadata({
        expected_amount_ore: String(DIRECT_AMOUNT_ORE - 5000),
      }),
    });
    const res = await postConfirm(directConfirmBody());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toMatch(/amount|stale_quote|mismatch/i);
    expect(store.reservationInserts).toHaveLength(0);
  });

  it("POST confirm: repeated same PI after binding → no double order (real PI lookup)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE,
      customer: "cus_test",
      payment_method: "pm_test",
      metadata: directPiMetadata(),
    });

    const first = await postConfirm(directConfirmBody());
    expect(first.status).toBe(200);
    const firstJson = await first.json();
    expect(store.reservationInserts).toHaveLength(1);

    // Age past recent cart window so Layer-3 cannot short-circuit before binding.
    for (const r of store.reservations) {
      r.created_at = new Date(Date.now() - 120_000).toISOString();
    }

    const retrieveCallsBefore = paymentIntentsRetrieve.mock.calls.length;
    const second = await postConfirm(directConfirmBody());
    const secondJson = await second.json();
    expect(second.status).toBe(200);
    expect(secondJson.idempotentReplay).toBe(true);
    expect(secondJson.reservationId).toBe(firstJson.reservationId);

    // Binding path must still retrieve the PI (not fake-skip checks).
    expect(paymentIntentsRetrieve.mock.calls.length).toBeGreaterThan(
      retrieveCallsBefore,
    );
    expect(store.reservationInserts).toHaveLength(1);
    expect(findOrCreateCalls).toHaveLength(0);
  });

  it("POST confirm POSITIVE shared_pallet SetupIntent path still creates pallet-bound order", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    resolveAndChargeCheckoutShipping.mockResolvedValue(SHARED_RATE);
    setupIntentsRetrieve.mockResolvedValue({
      id: "seti_shared_ok",
      status: "succeeded",
      payment_method: "pm_test",
      metadata: {
        expected_amount_ore: String(SHARED_AMOUNT_ORE),
        ...LEGAL_META,
      },
    });

    const res = await postConfirm({
      address: baseAddress,
      fulfillment_channel: "shared_pallet",
      selectedPalletId: "pallet-shared-1",
      stripe_intent_id: "seti_shared_ok",
      stripe_intent_type: "setup_intent",
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(store.reservationInserts).toHaveLength(1);
    const inserted = store.reservationInserts[0]!;
    expect(inserted.pallet_id).toBe("pallet-shared-1");
    expect(inserted.fulfillment_channel).toBeUndefined();
    expect(inserted.fulfillment_dispatch_status).toBeUndefined();
    expect(inserted.fulfillment_channel).toBeUndefined();
    expect(Number(inserted.total_sek)).toBe(SUBTOTAL_SEK);
    expect(inserted.shipping_revenue_gross_cents).toBe(
      Math.round(SHARED_SHIPPING_SEK * 100),
    );
    expect(findOrCreatePalletForRegion).not.toHaveBeenCalled();
  });

  it("POST confirm: B2C cart below 6 bottles is rejected (no reservation)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "false";
    getCart.mockResolvedValue({
      ...cartFixture("cart-blocked-2"),
      totalQuantity: 2,
      lines: [
        {
          id: "line-1",
          quantity: 2,
          source: "producer",
          cost: { totalAmount: { amount: "400" } },
          merchandise: {
            id: "w1",
            product: {
              title: "Test Wine",
              producerBoostActive: false,
              priceRange: { minVariantPrice: { amount: "200" } },
            },
          },
        },
      ],
      cost: { totalAmount: { amount: "400" } },
    });
    setupIntentsRetrieve.mockResolvedValue({
      id: "seti_blocked",
      status: "succeeded",
      payment_method: "pm_test",
      metadata: {
        expected_amount_ore: "49900",
        ...LEGAL_META,
      },
    });

    const res = await postConfirm({
      address: baseAddress,
      fulfillment_channel: "shared_pallet",
      selectedPalletId: "pallet-shared-1",
      stripe_intent_id: "seti_blocked",
      stripe_intent_type: "setup_intent",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(String(json.error)).toMatch(/at least 6 bottles/i);
    expect(store.reservationInserts).toHaveLength(0);
  });

  /**
   * Concurrent same-PI confirm: handler binds payment_intent_id at INSERT so
   * idx_order_reservations_payment_intent_id_unique (migrations/138_*.sql;
   * documented by draft migrations/278_*.sql) rejects the twin before items /
   * clearCart / attach race. Mock approximates UNIQUE via sync check-and-set
   * in insert(); that proves the application path (bind → 23505 → replay) under
   * Promise.all. It does NOT prove Postgres MVCC under real parallel clients —
   * production correctness still depends on that index remaining present.
   * No in-process serverless lock.
   */
  it("POST confirm concurrent same PI → at most one durable insert (unique at INSERT)", async () => {
    process.env.DIRECT_BOX_CHECKOUT_ENABLED = "true";
    loadDirectBoxCarrierConfigFromEnv.mockReturnValue(DIRECT_CARRIER);
    resolveAndChargeCheckoutShipping.mockResolvedValue(DIRECT_RATE);
    paymentIntentsRetrieve.mockResolvedValue({
      id: "pi_direct_ok",
      status: "succeeded",
      amount: DIRECT_AMOUNT_ORE,
      customer: "cus_test",
      payment_method: "pm_test",
      metadata: directPiMetadata(),
    });

    const clearCallsBefore = clearCart.mock.calls.length;
    const itemsBefore = store.items.length;
    const [a, b] = await Promise.all([
      postConfirm(directConfirmBody()),
      postConfirm(directConfirmBody()),
    ]);
    const ja = await a.json();
    const jb = await b.json();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    // Durable rows with this PI — unique enforced at INSERT (migration 138).
    const withPi = store.reservations.filter(
      (r) => r.payment_intent_id === "pi_direct_ok",
    );
    expect(withPi).toHaveLength(1);
    // Successful inserts carrying the PI (loser gets 23505, not pushed).
    const insertsWithPi = store.reservationInserts.filter(
      (r) => r.payment_intent_id === "pi_direct_ok",
    );
    expect(insertsWithPi).toHaveLength(1);
    expect(insertsWithPi[0]?.fulfillment_dispatch_status).toBe(
      "pending_manual_handoff",
    );
    expect(insertsWithPi[0]?.payment_status).toBe("paid");
    // Loser must not leave an unpaid twin without payment_intent_id.
    const unpaidTwins = store.reservations.filter(
      (r) => !r.payment_intent_id && r.fulfillment_channel === "direct_box",
    );
    expect(unpaidTwins).toHaveLength(0);
    expect(
      ja.reservationId === jb.reservationId ||
        ja.idempotentReplay ||
        jb.idempotentReplay,
    ).toBe(true);
    // Winner may clear cart / write items once; loser replays without a second
    // durable order or item fan-out.
    expect(clearCart.mock.calls.length - clearCallsBefore).toBeLessThanOrEqual(
      1,
    );
    expect(store.items.length - itemsBefore).toBeGreaterThan(0);
    // Same cart lines once — not doubled by the losing confirm.
    const itemReservationIds = new Set(
      store.items
        .slice(itemsBefore)
        .map((row) => String(row.reservation_id ?? "")),
    );
    expect(itemReservationIds.size).toBe(1);
  });
});

