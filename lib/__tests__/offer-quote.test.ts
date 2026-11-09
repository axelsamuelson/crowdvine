import { beforeEach, describe, expect, it } from "vitest";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  buildDualOfferQuoteSet,
  buildOfferContentDigest,
  buildOfferQuote,
  buildOfferQuoteId,
  buildSyntheticDirectOfferFromShared,
  buildUnavailableOfferQuote,
  canonicalOfferPayload,
  discloseOfferSwitch,
  hashOfferPayload,
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

const USER_A = "user-aaa";
const USER_B = "user-bbb";
const CART_1 = "cart-111";
const CART_2 = "cart-222";

describe("dual-offer compare flag", () => {
  it("defaults OFF", () => {
    expect(isDualOfferCompareEnabled({})).toBe(false);
    expect(isDualOfferCompareEnabled({ CHECKOUT_DUAL_OFFER_COMPARE: "true" })).toBe(
      true,
    );
  });
});

describe("offer quote versioning + tamper", () => {
  it("builds stable content_digest and scoped quote_id; detects tamper", () => {
    const q = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: USER_A,
      cart_id: CART_1,
      computed_at: "2026-11-08T20:00:00.000Z",
    });
    expect(q.quote_id.startsWith("oq_")).toBe(true);
    expect(q.content_digest).toHaveLength(64);
    expect(q.contract_policy).toBe("undecided");
    expect(q.bottle_count).toBe(8);
    expect(verifyOfferPayloadUntampered(q)).toBe(true);
    const tampered = { ...q, total_sek: q.total_sek + 50, total_ore: q.total_ore + 5000 };
    expect(verifyOfferPayloadUntampered(tampered)).toBe(false);
  });

  it("identical offer content for two users yields same digest but distinct quote_id", () => {
    const base = {
      offer: "shared_pallet" as const,
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog" as const,
      computed_at: "2026-11-08T20:00:00.000Z",
    };
    const a = buildOfferQuote({ ...base, user_id: USER_A, cart_id: CART_1 });
    const b = buildOfferQuote({ ...base, user_id: USER_B, cart_id: CART_2 });
    expect(a.content_digest).toBe(b.content_digest);
    expect(a.quote_id).not.toBe(b.quote_id);
    const canonical = canonicalOfferPayload({
      offer: a.offer,
      money: a,
      wine_lines: a.wine_lines,
      destination_country: a.destination_country,
      destination_zone_id: a.destination_zone_id,
      pricing_source: a.pricing_source,
      debit_timing_code: a.debit_timing.code,
      delivery_terms_code: a.delivery_terms.code,
      charge_deadline_at: a.charge_deadline_at,
    });
    expect(hashOfferPayload(canonical)).toBe(a.content_digest);
    expect(buildOfferContentDigest(canonical)).toBe(a.content_digest);
    expect(
      buildOfferQuoteId({
        userId: USER_A,
        cartId: CART_1,
        offer: "shared_pallet",
        contentDigest: a.content_digest,
      }),
    ).toBe(a.quote_id);
  });

  it("labels synthetic direct fixture and discloses switch deltas", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: USER_A,
      cart_id: CART_1,
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    expect(direct.pricing_source).toBe("synthetic_fixture");
    expect(direct.offer).toBe("direct_box");
    expect(direct.user_id).toBe(USER_A);
    expect(direct.cart_id).toBe(CART_1);
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
      user_id: USER_A,
      cart_id: CART_1,
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
      user_id: USER_A,
      cart_id: CART_1,
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    const dual = buildDualOfferQuoteSet({
      cart_id: CART_1,
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
      user_id: USER_A,
      cart_id: CART_1,
    });
    const dual = buildDualOfferQuoteSet({
      cart_id: CART_1,
      shared_pallet: shared,
      direct_box: null,
      selected_quote_id: shared.quote_id,
    });
    let state = createOfferCheckoutSessionState(dual);
    state = {
      ...state,
      dual: {
        ...dual,
        selected_quote_id: shared.quote_id,
        selected_offer: "shared_pallet",
      },
    };
    const acc = acceptSelectedOfferQuote({ state, quote_id: shared.quote_id });
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    state = acc.state;

    const nextShared = buildOfferQuote({
      offer: "shared_pallet",
      money: {
        ...sampleSharedMoney(),
        shipping_sek: 120,
        total_sek: 1020,
        total_ore: 102000,
      },
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: USER_A,
      cart_id: CART_1,
    });
    const nextDual = buildDualOfferQuoteSet({
      cart_id: CART_1,
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
      user_id: USER_A,
      cart_id: CART_1,
    });
    const state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: CART_1,
        shared_pallet: shared,
        direct_box: buildUnavailableOfferQuote({
          offer: "direct_box",
          reason: "ineligible_destination",
          user_id: USER_A,
          cart_id: CART_1,
        }),
      }),
    );
    const bad = acceptSelectedOfferQuote({
      state,
      quote_id: "oq_does_not_exist",
    });
    expect(bad.ok).toBe(false);
  });

  it("final gate rejects synthetic_fixture even after acceptance", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: USER_A,
      cart_id: CART_1,
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    let state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: CART_1,
        shared_pallet: shared,
        direct_box: direct,
        selected_quote_id: direct.quote_id,
      }),
    );
    const acc = acceptSelectedOfferQuote({
      state,
      quote_id: direct.quote_id,
    });
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    state = acc.state;
    const gate = mayEnableFinalCheckoutAction(state);
    expect(gate.allow).toBe(false);
    expect(gate.reason).toBe("synthetic_fixture_not_payable");
  });

  it("final gate rejects expired valid_until", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: sampleSharedMoney(),
      wine_lines: sampleLines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: USER_A,
      cart_id: CART_1,
      valid_until: "2026-11-08T10:00:00.000Z",
    });
    let state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: CART_1,
        shared_pallet: shared,
        direct_box: null,
        selected_quote_id: shared.quote_id,
      }),
    );
    const acc = acceptSelectedOfferQuote({
      state,
      quote_id: shared.quote_id,
    });
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    state = acc.state;
    const gate = mayEnableFinalCheckoutAction(
      state,
      "2026-11-08T12:00:00.000Z",
    );
    expect(gate.allow).toBe(false);
    expect(gate.reason).toBe("quote_expired");
  });
});

describe("payment method allowlist default-deny", () => {
  it("shared pallet phase 1: card verified; Klarna/BLIK denied", () => {
    expect(
      isMethodAllowedForOffer({ offer: "shared_pallet", method: "card" }),
    ).toMatchObject({ allow: true, reason: null });
    expect(
      isMethodAllowedForOffer({ offer: "shared_pallet", method: "klarna" }).allow,
    ).toBe(false);
    expect(
      isMethodAllowedForOffer({ offer: "shared_pallet", method: "klarna" }).reason,
    ).toBe("method_denied");
    expect(
      isMethodAllowedForOffer({ offer: "shared_pallet", method: "blik" }).reason,
    ).toBe("method_denied");
    expect(
      isMethodAllowedForOffer({ offer: "direct_box", method: "unknown_pay" }).reason,
    ).toBe("method_not_in_allowlist");
    expect(previewVisibleMethods("shared_pallet")).toEqual(["card"]);
  });
});
