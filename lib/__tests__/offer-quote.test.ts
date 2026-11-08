import { beforeEach, describe, expect, it } from "vitest";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  buildDualOfferQuoteSet,
  buildOfferQuote,
  buildSyntheticDirectOfferFromShared,
  buildUnavailableOfferQuote,
  discloseOfferSwitch,
  isDualOfferCompareEnabled,
  SYNTHETIC_DIRECT_BOX_FIXTURE,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import {
  acceptSelectedOfferQuote,
  createOfferCheckoutSessionState,
  mayEnableFinalCheckoutAction,
  reconcileAcceptanceAfterRecompute,
  switchSelectedOffer,
  verifyOfferPayloadUntampered,
} from "@/lib/checkout/offer-acceptance";
import {
  isMethodAllowedForOffer,
  previewVisibleMethods,
} from "@/lib/checkout/offer-payment-methods";
import {
  findReusableSharedPalletIntent,
  resetSharedPalletIntentFlightsForTests,
  sharedPalletIntentFlightKey,
  withSharedPalletIntentSingleFlight,
} from "@/lib/checkout/shared-pallet-intent-idempotency";

function sampleLines(): OfferLineSnapshot[] {
  return [
    {
      wine_id: "wine-a",
      quantity: 6,
      unit_price_sek: 100,
      line_total_sek: 600,
    },
    {
      wine_id: "wine-b",
      quantity: 2,
      unit_price_sek: 150,
      line_total_sek: 300,
    },
  ];
}

function sampleSharedMoney(): CheckoutQuote {
  return {
    subtotal_sek: 900,
    shipping_sek: 99,
    promo_discount_sek: 0,
    voucher_discount_sek: 0,
    pact_points_sek: 0,
    pact_points_redeem: 0,
    total_sek: 999,
    total_ore: 99900,
    shipping_pending: false,
    fulfillment_channel: "shared_pallet",
    rate_channel: "pact",
  };
}

describe("dual-offer compare flag", () => {
  it("defaults OFF", () => {
    expect(isDualOfferCompareEnabled({})).toBe(false);
    expect(isDualOfferCompareEnabled({ CHECKOUT_DUAL_OFFER_COMPARE: "true" })).toBe(
      true,
    );
  });
});

describe("offer quote versioning + tamper", () => {
  it("builds stable quote_id from payload and detects tamper", () => {
    const q = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      computed_at: "2026-11-08T20:00:00.000Z",
    });
    expect(q.quote_id.startsWith("oq_")).toBe(true);
    expect(q.contract_policy).toBe("undecided");
    expect(q.bottle_count).toBe(8);
    expect(verifyOfferPayloadUntampered(q)).toBe(true);
    const tampered = { ...q, total_sek: q.total_sek + 50, total_ore: q.total_ore + 5000 };
    expect(verifyOfferPayloadUntampered(tampered)).toBe(false);
  });

  it("labels synthetic direct fixture and discloses switch deltas", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    expect(direct.pricing_source).toBe("synthetic_fixture");
    expect(direct.offer).toBe("direct_box");
    expect(direct.bottle_unit_price_sek).toBeGreaterThan(shared.bottle_unit_price_sek);
    expect(direct.shipping_sek).toBe(SYNTHETIC_DIRECT_BOX_FIXTURE.shipping_sek);
    const d = discloseOfferSwitch({ from: shared, to: direct });
    expect(d.ok).toBe(true);
    expect(d.total_to_sek).toBe(direct.total_sek);
  });

  it("fail-closed unavailable offer cannot be switched to", () => {
    const bad = buildUnavailableOfferQuote({
      offer: "direct_box",
      reason: "direct_box_disabled",
    });
    expect(bad.unavailable_reason).toBe("direct_box_disabled");
    expect(discloseOfferSwitch({ from: null, to: bad }).ok).toBe(false);
  });
});

describe("offer acceptance + switch invalidation", () => {
  it("requires explicit acceptance before final action; switch clears acceptance", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    const dual = buildDualOfferQuoteSet({
      cart_id: "cart-1",
      shared_pallet: shared,
      direct_box: direct,
    });
    let state = createOfferCheckoutSessionState(dual);
    expect(mayEnableFinalCheckoutAction(state).allow).toBe(false);

    const sw = switchSelectedOffer({
      state,
      toOffer: "shared_pallet",
      openIntentIds: ["pi_old"],
    });
    state = sw.state;
    expect(state.invalidated_intent_ids).toContain("pi_old");
    expect(state.acceptance).toBeNull();
    expect(state.uncertainty_block).toBe(true);

    const acc = acceptSelectedOfferQuote({
      state,
      quote_id: shared.quote_id,
      accepted_at: "2026-11-08T21:00:00.000Z",
    });
    expect(acc.ok).toBe(true);
    if (acc.ok) {
      state = acc.state;
      expect(mayEnableFinalCheckoutAction(state).allow).toBe(true);
    }

    const sw2 = switchSelectedOffer({ state, toOffer: "direct_box" });
    state = sw2.state;
    expect(state.acceptance).toBeNull();
    expect(mayEnableFinalCheckoutAction(state).allow).toBe(false);
  });

  it("rejects tampered acceptance and stale recompute", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
    });
    const dual = buildDualOfferQuoteSet({
      cart_id: "cart-1",
      shared_pallet: shared,
      direct_box: null,
      selected_quote_id: shared.quote_id,
    });
    let state = createOfferCheckoutSessionState(dual);
    state = {
      ...state,
      dual: { ...dual, selected_quote_id: shared.quote_id, selected_offer: "shared_pallet" },
    };
    const acc = acceptSelectedOfferQuote({ state, quote_id: shared.quote_id });
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    state = acc.state;

    const nextShared = buildOfferQuote({
      offer: "shared_pallet",
      money: { ...sampleSharedMoney(), shipping_sek: 120, total_sek: 1020, total_ore: 102000 },
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
    });
    const nextDual = buildDualOfferQuoteSet({
      cart_id: "cart-1",
      shared_pallet: nextShared,
      direct_box: null,
    });
    state = reconcileAcceptanceAfterRecompute({ state, nextDual });
    expect(state.acceptance).toBeNull();
    expect(state.uncertainty_reason).toBe("stale_acceptance");
  });

  it("rejects accept when quote_id not in set (mixed/ineligible)", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
    });
    const state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: "c",
        shared_pallet: shared,
        direct_box: buildUnavailableOfferQuote({
          offer: "direct_box",
          reason: "ineligible_destination",
        }),
      }),
    );
    const bad = acceptSelectedOfferQuote({
      state,
      quote_id: "oq_does_not_exist",
    });
    expect(bad.ok).toBe(false);
  });
});

describe("payment method allowlist default-deny", () => {
  it("denies unverified candidates and unknown methods", () => {
    expect(
      isMethodAllowedForOffer({ offer: "shared_pallet", method: "klarna" }).allow,
    ).toBe(false);
    expect(
      isMethodAllowedForOffer({ offer: "shared_pallet", method: "klarna" }).reason,
    ).toBe("method_unverified");
    expect(
      isMethodAllowedForOffer({ offer: "direct_box", method: "unknown_pay" }).reason,
    ).toBe("method_not_in_allowlist");
    expect(previewVisibleMethods("shared_pallet")).toContain("card");
  });
});

describe("shared-pallet intent idempotency", () => {
  beforeEach(() => {
    resetSharedPalletIntentFlightsForTests();
  });

  it("reuses open PI with matching metadata", () => {
    const found = findReusableSharedPalletIntent({
      mode: "payment_intent",
      sessionUserId: "user-1",
      palletId: "pal-1",
      expectedAmountOre: 99900,
      intents: [
        {
          id: "pi_a",
          status: "requires_payment_method",
          client_secret: "sec_a",
          metadata: {
            user_id: "user-1",
            pallet_id: "pal-1",
            expected_amount_ore: "99900",
            fulfillment_channel: "shared_pallet",
          },
        },
      ],
    });
    expect(found?.id).toBe("pi_a");
  });

  it("does not reuse mismatched amount or conditional SI metadata", () => {
    expect(
      findReusableSharedPalletIntent({
        mode: "payment_intent",
        sessionUserId: "user-1",
        palletId: "pal-1",
        expectedAmountOre: 99900,
        intents: [
          {
            id: "pi_b",
            status: "requires_payment_method",
            client_secret: "sec",
            metadata: {
              user_id: "user-1",
              pallet_id: "pal-1",
              expected_amount_ore: "100",
              fulfillment_channel: "shared_pallet",
            },
          },
        ],
      }),
    ).toBeNull();
    expect(
      findReusableSharedPalletIntent({
        mode: "setup_intent",
        sessionUserId: "user-1",
        palletId: "pal-1",
        expectedAmountOre: 99900,
        intents: [
          {
            id: "seti_c",
            status: "requires_payment_method",
            client_secret: "sec",
            metadata: {
              user_id: "user-1",
              pallet_id: "pal-1",
              expected_amount_ore: "99900",
              reservation_mode: "conditional",
            },
          },
        ],
      }),
    ).toBeNull();
  });

  it("single-flight collapses concurrent identical creates", async () => {
    const key = sharedPalletIntentFlightKey({
      mode: "payment_intent",
      userId: "u",
      palletId: "p",
      amountOre: 1,
    });
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
});
