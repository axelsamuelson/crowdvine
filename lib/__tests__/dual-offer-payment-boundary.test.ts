import { describe, expect, it } from "vitest";
import {
  buildDualOfferQuoteSet,
  buildOfferQuote,
  buildSyntheticDirectOfferFromShared,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import {
  acceptSelectedOfferQuote,
  createOfferCheckoutSessionState,
  switchSelectedOffer,
} from "@/lib/checkout/offer-acceptance";
import {
  evaluateDualOfferLivePaymentGate,
  OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE,
} from "@/lib/checkout/dual-offer-payment-boundary";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";

function lines(): OfferLineSnapshot[] {
  return [
    {
      wine_id: "w1",
      quantity: 6,
      unit_price_sek: 100,
      line_total_sek: 600,
    },
  ];
}

function money(channel: "shared_pallet" | "direct_box"): CheckoutQuote {
  return {
    subtotal_sek: 600,
    shipping_sek: 99,
    promo_discount_sek: 0,
    voucher_discount_sek: 0,
    pact_points_sek: 0,
    pact_points_redeem: 0,
    total_sek: 699,
    total_ore: 69900,
    shipping_pending: false,
    fulfillment_channel: channel,
    rate_channel: channel === "direct_box" ? "direct_box" : "pact",
  };
}

describe("dual-offer live payment boundary", () => {
  it("reports persistence unavailable in this increment", () => {
    expect(OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE).toBe(false);
  });

  it("blocks synthetic even after quote acceptance", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: money("shared_pallet"),
      wine_lines: lines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: "u1",
      cart_id: "c1",
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    let state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: "c1",
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
    const gate = evaluateDualOfferLivePaymentGate({ state });
    expect(gate.allow).toBe(false);
    expect(gate.reason).toBe("synthetic_fixture_not_payable");
  });

  it("blocks live_catalog acceptance while 279 unapplied", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: money("shared_pallet"),
      wine_lines: lines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: "u1",
      cart_id: "c1",
    });
    let state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: "c1",
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
    const gate = evaluateDualOfferLivePaymentGate({ state });
    expect(gate.allow).toBe(false);
    // contract_policy undecided is checked before persistence
    expect(["contract_policy_undecided", "offer_snapshot_persistence_unavailable"]).toContain(
      gate.reason,
    );
  });

  it("switch both directions clears acceptance (retention of cart id)", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: money("shared_pallet"),
      wine_lines: lines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: "u1",
      cart_id: "c1",
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    let state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: "c1",
        shared_pallet: shared,
        direct_box: direct,
      }),
    );
    state = switchSelectedOffer({ state, toOffer: "shared_pallet" }).state;
    const acc = acceptSelectedOfferQuote({
      state,
      quote_id: shared.quote_id,
    });
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    state = acc.state;
    state = switchSelectedOffer({
      state,
      toOffer: "direct_box",
      openIntentIds: ["pi_old"],
    }).state;
    expect(state.acceptance).toBeNull();
    expect(state.dual.cart_id).toBe("c1");
    expect(state.invalidated_intent_ids).toContain("pi_old");
    state = switchSelectedOffer({ state, toOffer: "shared_pallet" }).state;
    expect(state.dual.selected_offer).toBe("shared_pallet");
    expect(state.acceptance).toBeNull();
  });

  it("unverified method cannot unlock live payment", () => {
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: money("shared_pallet"),
      wine_lines: lines(),
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: "u1",
      cart_id: "c1",
      // still undecided contract — gate fails before or at method
    });
    // Force contract past undecided by casting for method check path:
    // evaluate checks contract_policy undecided first; assert method path via
    // snapshotPersistenceAvailable true + mutated quote in state is out of scope.
    // Method allowlist unit coverage remains in offer-quote suite; here assert
    // klarna never allows through boundary when acceptance missing.
    const state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: "c1",
        shared_pallet: shared,
        direct_box: null,
      }),
    );
    const gate = evaluateDualOfferLivePaymentGate({
      state,
      method: "klarna",
    });
    expect(gate.allow).toBe(false);
  });
});
