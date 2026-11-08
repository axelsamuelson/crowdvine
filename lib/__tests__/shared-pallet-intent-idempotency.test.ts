import { beforeEach, describe, expect, it } from "vitest";
import {
  SHARED_PALLET_IDEMPOTENCY_VERSION,
  SharedPalletIntentUnusableError,
  buildSharedPalletIntentMetadata,
  buildSharedPalletRecoveryIdempotencyKey,
  buildSharedPalletStripeIdempotencyKey,
  createSharedPalletIntentWithReplayGuard,
  findReusableSharedPalletIntent,
  resetSharedPalletIntentFlightsForTests,
  sharedPalletIntentFlightKey,
  sharedPalletIntentReplayDisposition,
  shouldReuseOpenSharedPalletPaymentIntent,
  withSharedPalletIntentSingleFlight,
  type SharedPalletIntentContext,
  type StripeIntentLike,
} from "@/lib/checkout/shared-pallet-intent-idempotency";

const baseContext: SharedPalletIntentContext = {
  sessionUserId: "user-1",
  cartId: "cart-1",
  palletId: "pal-1",
  expectedAmountOre: 99900,
  currency: "sek",
  stripeCustomerId: "cus_1",
  pactPointsRedeem: 0,
  promoDiscountSek: 0,
  voucherDiscountSek: 0,
  ageVerifiedDob: "1990-01-01",
  ageVerificationMethod: "self_declared_dob",
  purchaseTermsVersion: "terms-v1",
  usConditional: false,
  usRegion: null,
};

function matchingPi(
  overrides: Partial<StripeIntentLike> = {},
  metaOverrides: Record<string, string> = {},
): StripeIntentLike {
  return {
    id: "pi_match",
    status: "requires_payment_method",
    client_secret: "sec_pi",
    amount: 99900,
    currency: "sek",
    customer: "cus_1",
    payment_method: null,
    metadata: {
      ...buildSharedPalletIntentMetadata(baseContext),
      ...metaOverrides,
    },
    ...overrides,
  };
}

describe("shared-pallet PI reuse invariants", () => {
  it("reuses open PI when full snapshot matches", () => {
    const found = findReusableSharedPalletIntent({
      intentKind: "payment_intent",
      context: baseContext,
      intents: [matchingPi()],
    });
    expect(found?.id).toBe("pi_match");
  });

  it("rejects reuse when cart_id differs (equal total, changed cart)", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { cart_id: "cart-other" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects reuse when currency differs", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({ currency: "eur" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects reuse when legal/age metadata differs", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { age_verified_dob: "1980-01-01" }),
        context: baseContext,
      }),
    ).toBe(false);
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { purchase_terms_version: "terms-old" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects reuse when Stripe customer differs", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({ customer: "cus_other" }),
        context: baseContext,
      }),
    ).toBe(false);
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { stripe_customer_id: "cus_other" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects reuse when PI actual amount differs from expected", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({ amount: 100 }),
        context: baseContext,
      }),
    ).toBe(false);
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { expected_amount_ore: "100" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects reuse when promo or points metadata drifts", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { promo_discount_sek: "50" }),
        context: baseContext,
      }),
    ).toBe(false);
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { pact_points_redeem: "100" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects requires_confirmation (MEDIUM — attached method risk)", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({ status: "requires_confirmation" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects terminal statuses and attached payment_method", () => {
    for (const status of [
      "succeeded",
      "canceled",
      "requires_action",
      "processing",
    ]) {
      expect(
        shouldReuseOpenSharedPalletPaymentIntent({
          candidate: matchingPi({ status }),
          context: baseContext,
        }),
      ).toBe(false);
    }
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({ payment_method: "pm_attached" }),
        context: baseContext,
      }),
    ).toBe(false);
  });

  it("rejects conditional reservation metadata on shared PI", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({}, { reservation_mode: "conditional" }),
        context: baseContext,
      }),
    ).toBe(false);
  });
});

describe("shared-pallet SI reuse invariants", () => {
  it("reuses SI only with requires_payment_method and full legal/cart match", () => {
    const found = findReusableSharedPalletIntent({
      intentKind: "setup_intent",
      context: baseContext,
      intents: [
        {
          id: "seti_ok",
          status: "requires_payment_method",
          client_secret: "sec_si",
          payment_method: null,
          metadata: buildSharedPalletIntentMetadata(baseContext),
        },
      ],
    });
    expect(found?.id).toBe("seti_ok");
  });

  it("does not reuse incomplete US conditional SI metadata", () => {
    expect(
      findReusableSharedPalletIntent({
        intentKind: "setup_intent",
        context: {
          ...baseContext,
          usConditional: true,
          usRegion: "CA",
          usConditionalTermsVersion: "US_CONDITIONAL_RESERVATION_v1",
          purchaseTermsVersion: null,
        },
        intents: [
          {
            id: "seti_c",
            status: "requires_payment_method",
            client_secret: "sec",
            metadata: {
              ...buildSharedPalletIntentMetadata(baseContext),
              reservation_mode: "conditional",
            },
          },
        ],
      }),
    ).toBeNull();
  });

  it("reuses US conditional SI when region + terms_version match", () => {
    const usCtx: SharedPalletIntentContext = {
      ...baseContext,
      usConditional: true,
      usRegion: "CA",
      usConditionalTermsVersion: "US_CONDITIONAL_RESERVATION_v1",
      purchaseTermsVersion: null,
    };
    const found = findReusableSharedPalletIntent({
      intentKind: "setup_intent",
      context: usCtx,
      intents: [
        {
          id: "seti_us",
          status: "requires_payment_method",
          client_secret: "sec_us",
          payment_method: null,
          metadata: {
            ...buildSharedPalletIntentMetadata(usCtx, {
              country_code: "US",
              region: "CA",
              market_code: "US",
              reservation_mode: "conditional",
              terms_version: "US_CONDITIONAL_RESERVATION_v1",
            }),
          },
        },
      ],
    });
    expect(found?.id).toBe("seti_us");
  });
});

describe("shared-pallet distributed create idempotency", () => {
  beforeEach(() => {
    resetSharedPalletIntentFlightsForTests();
  });

  it("Idempotency-Key is deterministic for same context + versioned", () => {
    const a = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    const b = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    expect(a).toBe(b);
    expect(a).toContain(SHARED_PALLET_IDEMPOTENCY_VERSION);
    expect(a.startsWith("sp_payment_intent_")).toBe(true);
  });

  it("Idempotency-Key changes when cart/currency/legal/amount drifts", () => {
    const base = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    expect(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "payment_intent",
        context: { ...baseContext, cartId: "cart-2" },
      }),
    ).not.toBe(base);
    expect(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "payment_intent",
        context: { ...baseContext, currency: "eur" },
      }),
    ).not.toBe(base);
    expect(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "payment_intent",
        context: { ...baseContext, expectedAmountOre: 1 },
      }),
    ).not.toBe(base);
    expect(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "payment_intent",
        context: { ...baseContext, ageVerifiedDob: "1985-05-05" },
      }),
    ).not.toBe(base);
  });

  it("process-local single-flight collapses concurrent identical creates", async () => {
    const key = sharedPalletIntentFlightKey(
      buildSharedPalletStripeIdempotencyKey({
        intentKind: "payment_intent",
        context: baseContext,
      }),
    );
    let calls = 0;
    const factory = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { id: "pi_one" };
    };
    const [a, b] = await Promise.all([
      withSharedPalletIntentSingleFlight(key, factory),
      withSharedPalletIntentSingleFlight(key, factory),
    ]);
    expect(a).toEqual(b);
    expect(calls).toBe(1);
  });

  it("simulated separate instances: flight miss still shares deterministic Idempotency-Key", async () => {
    // Instance A
    const keyA = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    resetSharedPalletIntentFlightsForTests();
    // Instance B (empty flight map) — must still emit the same Stripe key
    const keyB = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    expect(keyA).toBe(keyB);

    const stripeCreateCalls: string[] = [];
    const simulateInstanceCreate = async (idemKey: string) => {
      // Separate instances do not share inflight — each may call create once.
      stripeCreateCalls.push(idemKey);
      return { id: `pi_from_${idemKey.slice(-8)}`, idempotencyKey: idemKey };
    };

    const [r1, r2] = await Promise.all([
      simulateInstanceCreate(keyA),
      simulateInstanceCreate(keyB),
    ]);
    expect(stripeCreateCalls).toHaveLength(2);
    expect(stripeCreateCalls[0]).toBe(stripeCreateCalls[1]);
    expect(r1.idempotencyKey).toBe(r2.idempotencyKey);
  });

  it("stale or canceled attempts are not reused; new create uses same key only if context unchanged", () => {
    expect(
      findReusableSharedPalletIntent({
        intentKind: "payment_intent",
        context: baseContext,
        intents: [
          matchingPi({ id: "pi_canceled", status: "canceled" }),
          matchingPi({ id: "pi_stale", status: "requires_payment_method" }, {
            cart_id: "old-cart",
          }),
        ],
      }),
    ).toBeNull();

    const keyUnchanged = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    const keyAfterCartChange = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: { ...baseContext, cartId: "old-cart" },
    });
    expect(keyUnchanged).not.toBe(keyAfterCartChange);
  });

  it("US conditional terms_version participates in Idempotency-Key material", () => {
    const usBase: SharedPalletIntentContext = {
      ...baseContext,
      usConditional: true,
      usRegion: "NY",
      purchaseTermsVersion: null,
      usConditionalTermsVersion: "US_CONDITIONAL_RESERVATION_v1",
    };
    const keyV1 = buildSharedPalletStripeIdempotencyKey({
      intentKind: "setup_intent",
      context: usBase,
    });
    const keyV2 = buildSharedPalletStripeIdempotencyKey({
      intentKind: "setup_intent",
      context: {
        ...usBase,
        usConditionalTermsVersion: "US_CONDITIONAL_RESERVATION_v2",
      },
    });
    expect(keyV1).not.toBe(keyV2);
    expect(keyV1).toContain(SHARED_PALLET_IDEMPOTENCY_VERSION);
  });
});

describe("shared-pallet idempotent replay guard", () => {
  beforeEach(() => {
    resetSharedPalletIntentFlightsForTests();
  });

  it("disposition: canceled/attached → recover; succeeded/processing PI → fail_closed", () => {
    expect(
      sharedPalletIntentReplayDisposition({
        intentKind: "payment_intent",
        context: baseContext,
        candidate: matchingPi({ status: "canceled" }),
      }),
    ).toBe("recover");
    expect(
      sharedPalletIntentReplayDisposition({
        intentKind: "payment_intent",
        context: baseContext,
        candidate: matchingPi({ payment_method: "pm_1" }),
      }),
    ).toBe("recover");
    expect(
      sharedPalletIntentReplayDisposition({
        intentKind: "payment_intent",
        context: baseContext,
        candidate: matchingPi({ status: "succeeded" }),
      }),
    ).toBe("fail_closed");
    expect(
      sharedPalletIntentReplayDisposition({
        intentKind: "payment_intent",
        context: baseContext,
        candidate: matchingPi({ status: "processing" }),
      }),
    ).toBe("fail_closed");
    expect(
      sharedPalletIntentReplayDisposition({
        intentKind: "payment_intent",
        context: baseContext,
        candidate: matchingPi(),
      }),
    ).toBe("ready");
  });

  it("list miss + same-key canceled replay recovers once under deterministic supersedes key", async () => {
    const baseKey = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    const recoveryKey = buildSharedPalletRecoveryIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
      supersedesIntentId: "pi_dead",
    });
    const keys: string[] = [];
    const result = await createSharedPalletIntentWithReplayGuard({
      intentKind: "payment_intent",
      context: baseContext,
      create: async (key) => {
        keys.push(key);
        if (key === baseKey) {
          return matchingPi({ id: "pi_dead", status: "canceled" });
        }
        expect(key).toBe(recoveryKey);
        return matchingPi({ id: "pi_fresh" });
      },
    });
    expect(result.intent.id).toBe("pi_fresh");
    expect(result.recoveredFromId).toBe("pi_dead");
    expect(result.idempotencyKeyUsed).toBe(recoveryKey);
    expect(keys).toEqual([baseKey, recoveryKey]);
  });

  it("same-key succeeded PI fails closed without recovery create", async () => {
    const baseKey = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    let creates = 0;
    await expect(
      createSharedPalletIntentWithReplayGuard({
        intentKind: "payment_intent",
        context: baseContext,
        create: async (key) => {
          creates += 1;
          expect(key).toBe(baseKey);
          return matchingPi({ id: "pi_paid", status: "succeeded" });
        },
      }),
    ).rejects.toBeInstanceOf(SharedPalletIntentUnusableError);
    expect(creates).toBe(1);
  });

  it("attached-method SI replay recovers; concurrent callers share recovery key", async () => {
    const baseKey = buildSharedPalletStripeIdempotencyKey({
      intentKind: "setup_intent",
      context: baseContext,
    });
    const recoveryKey = buildSharedPalletRecoveryIdempotencyKey({
      intentKind: "setup_intent",
      context: baseContext,
      supersedesIntentId: "seti_dead",
    });
    const cache = new Map<string, StripeIntentLike>();
    cache.set(
      baseKey,
      {
        id: "seti_dead",
        status: "requires_payment_method",
        client_secret: "sec_old",
        payment_method: "pm_attached",
        metadata: buildSharedPalletIntentMetadata(baseContext),
      },
    );

    const create = async (key: string) => {
      const hit = cache.get(key);
      if (hit) return hit;
      const fresh: StripeIntentLike = {
        id: "seti_fresh",
        status: "requires_payment_method",
        client_secret: "sec_fresh",
        payment_method: null,
        metadata: buildSharedPalletIntentMetadata(baseContext),
      };
      cache.set(key, fresh);
      return fresh;
    };

    const [a, b] = await Promise.all([
      createSharedPalletIntentWithReplayGuard({
        intentKind: "setup_intent",
        context: baseContext,
        create,
      }),
      createSharedPalletIntentWithReplayGuard({
        intentKind: "setup_intent",
        context: baseContext,
        create,
      }),
    ]);
    expect(a.intent.id).toBe("seti_fresh");
    expect(b.intent.id).toBe("seti_fresh");
    expect(a.idempotencyKeyUsed).toBe(recoveryKey);
    expect(b.idempotencyKeyUsed).toBe(recoveryKey);
  });

  it("legitimate stable retry returns ready intent without recovery key", async () => {
    const baseKey = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: baseContext,
    });
    let creates = 0;
    const open = matchingPi({ id: "pi_stable" });
    const first = await createSharedPalletIntentWithReplayGuard({
      intentKind: "payment_intent",
      context: baseContext,
      create: async (key) => {
        creates += 1;
        expect(key).toBe(baseKey);
        return open;
      },
    });
    const second = await createSharedPalletIntentWithReplayGuard({
      intentKind: "payment_intent",
      context: baseContext,
      create: async (key) => {
        creates += 1;
        expect(key).toBe(baseKey);
        return open; // Stripe idempotent replay of same open PI
      },
    });
    expect(first.recoveredFromId).toBeNull();
    expect(second.recoveredFromId).toBeNull();
    expect(first.intent.id).toBe("pi_stable");
    expect(second.intent.id).toBe("pi_stable");
    expect(creates).toBe(2);
  });

  it("rejects missing client_secret as non-ready (PI/SI)", () => {
    expect(
      shouldReuseOpenSharedPalletPaymentIntent({
        candidate: matchingPi({ client_secret: null }),
        context: baseContext,
      }),
    ).toBe(false);
    expect(
      sharedPalletIntentReplayDisposition({
        intentKind: "payment_intent",
        context: baseContext,
        candidate: matchingPi({ client_secret: "" }),
      }),
    ).toBe("recover");
  });
});
