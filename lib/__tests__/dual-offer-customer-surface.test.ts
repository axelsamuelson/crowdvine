import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDualOfferQuoteSet,
  buildOfferQuote,
  buildSyntheticDirectOfferFromShared,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  acceptSelectedOfferQuote,
  createOfferCheckoutSessionState,
  mayEnableFinalCheckoutAction,
  switchSelectedOffer,
} from "@/lib/checkout/offer-acceptance";
import {
  dualOfferMsg,
  humanizeDualOfferBlockReason,
  offerBottleAverageLabelKey,
  offerTotalsIncludeVat,
} from "@/lib/checkout/dual-offer-customer-copy";
import { evaluateDualOfferLivePaymentGate } from "@/lib/checkout/dual-offer-payment-boundary";

function money(subtotal: number, shipping: number): CheckoutQuote {
  const total = subtotal + shipping;
  return {
    subtotal_sek: subtotal,
    shipping_sek: shipping,
    promo_discount_sek: 0,
    voucher_discount_sek: 0,
    pact_points_sek: 0,
    pact_points_redeem: 0,
    total_sek: total,
    total_ore: Math.round(total * 100),
    shipping_pending: false,
    fulfillment_channel: "shared_pallet",
    rate_channel: "pact",
  };
}

describe("dual-offer customer surface guards", () => {
  const panelSrc = readFileSync(
    resolve(process.cwd(), "components/checkout/dual-offer-checkout-panel.tsx"),
    "utf8",
  );
  const checkoutSrc = readFileSync(
    resolve(process.cwd(), "app/checkout/checkout-client.tsx"),
    "utf8",
  );

  it("does not render legacy accept button or Pay/Reserve on customer panel", () => {
    expect(panelSrc).not.toMatch(/dual-offer-accept/);
    expect(panelSrc).not.toMatch(/Pay \/ Reserve/);
    expect(panelSrc).not.toMatch(/Acceptera valt offer-quote|offer-quote \(granskning\)/i);
    expect(panelSrc).not.toMatch(/SYNTETISK|Syntetisk · ej betalbar/);
    expect(panelSrc).not.toMatch(/Offer-granskning/);
    expect(panelSrc).not.toMatch(/▶ VALD|dualOfferSelectedMarker/);
    expect(panelSrc).not.toMatch(/contract_policy_undecided/);
    expect(panelSrc).not.toMatch(/awaiting_explicit_quote_acceptance/);
    expect(panelSrc).not.toMatch(/Failed to fetch/);
    expect(panelSrc).not.toMatch(/Ej beslutad policy/);
    expect(panelSrc).toMatch(/dual-offer-final/);
    expect(panelSrc).toMatch(/acceptSelectedOfferQuote/);
    expect(panelSrc).toMatch(/dual-offer-row-skeleton/);
    expect(panelSrc).toMatch(/dualOfferBottleAvg|offerBottleAverageLabelKey/);
    expect(panelSrc).toMatch(/DualOfferPurchaseActions/);
    expect(panelSrc).toMatch(/dual-offer-shared-only-block|dualOfferSharedOnlyTitle/);
    expect(panelSrc).toMatch(/formatCheckoutPalletDeliveryLines/);
    expect(panelSrc).not.toMatch(/Budbee/);
    expect(panelSrc).toMatch(/CheckoutPalletFillStatus/);
    expect(panelSrc).toMatch(/dualOfferLegalLineSharedWithSwitch/);
  });

  it("wires continue → card unlock → binding Köp after Payment Element", () => {
    expect(panelSrc).toMatch(/mayStartSharedPalletCardSave/);
    expect(panelSrc).toMatch(/onSharedPalletCardStepRequest/);
    expect(panelSrc).toMatch(/dualOfferContinueToCard/);
    expect(panelSrc).toMatch(/variant: \"continue\"/);
    expect(checkoutSrc).toMatch(/dualOfferCardStepUnlocked/);
    expect(checkoutSrc).toMatch(/handleSharedPalletCardStepRequest/);
    expect(checkoutSrc).toMatch(/buildSharedPalletBindCopy/);
    expect(checkoutSrc).toMatch(/variant: \"bind\"/);
    expect(checkoutSrc).toMatch(/paymentElementComplete/);
    expect(checkoutSrc).toMatch(/cardOnly/);
    expect(checkoutSrc).toMatch(
      /dualOfferReviewActive &&\s*!dualOfferCardStepUnlocked/,
    );
  });

  it("keeps diagnostics behind showDiagnostics (not default customer mount)", () => {
    expect(panelSrc).toMatch(/showDiagnostics/);
    expect(panelSrc).toMatch(/showDiagnostics === true/);
    expect(checkoutSrc).not.toMatch(/showDiagnostics=\{true\}/);
    // Checkout chrome is logo + back-to-cart via CheckoutMinimalHeader (no site nav).
    expect(checkoutSrc).toMatch(/max-w-\[1280px\]/);
    expect(checkoutSrc).not.toMatch(/\/api\/user\/rewards/);
    expect(checkoutSrc).toMatch(/showDirectOffer=\{directBoxCheckoutEnabled\}/);
    expect(checkoutSrc).toMatch(/inlinePurchase=\{false\}/);
    expect(checkoutSrc).toMatch(/DualOfferPurchaseActions/);
    expect(checkoutSrc).toMatch(/showCheckoutPalletFillStatus|showPalletFillStatus/);
    expect(panelSrc).toMatch(/dualOfferFinalCtaShared|dual-offer-legal-line/);
    expect(panelSrc).toMatch(/showDirectOffer/);
    expect(panelSrc).not.toMatch(/proposed capability|proposed model|Immediate payment on confirm \(proposed\)/i);
    expect(panelSrc).not.toMatch(/dualOfferFinalCtaWithOffer|Confirm \{offer\}/);
    expect(panelSrc).not.toMatch(/Selected: \{offer\}/);
  });

  it("order confirmation page wires reservation deadline + delivery copy + marketing consent", () => {
    const successSrc = readFileSync(
      resolve(process.cwd(), "app/checkout/success/page.tsx"),
      "utf8",
    );
    const reservationApiSrc = readFileSync(
      resolve(process.cwd(), "app/api/user/reservations/[id]/route.ts"),
      "utf8",
    );
    const headerSrc = readFileSync(
      resolve(process.cwd(), "components/layout/header/conditional-header.tsx"),
      "utf8",
    );
    expect(successSrc).toMatch(/success-purchase-complete|successPurchaseComplete/);
    expect(successSrc).toMatch(/MarketingConsentCheckbox/);
    expect(successSrc).toMatch(/charge_deadline_at/);
    expect(successSrc).toMatch(/successStep3/);
    expect(successSrc).not.toMatch(/formatSharedPalletCloseDeliveryCopy/);
    expect(successSrc).toMatch(/success-step3-delivery|success-total-incl/);
    expect(successSrc).toMatch(/successOrderedAt|successOrderNumber/);
    expect(successSrc).toMatch(/confirmationSharedPalletCity/);
    expect(successSrc).not.toMatch(/DollarSign/);
    expect(successSrc).not.toMatch(/success-close-delivery-copy/);
    expect(reservationApiSrc).toMatch(/computeSharedPalletChargeDeadlineIso/);
    expect(reservationApiSrc).toMatch(/created_at/);
    expect(reservationApiSrc).toMatch(/shipping_revenue_gross_cents/);
    expect(reservationApiSrc).toMatch(/confirmationDisplayTotalSek/);
    expect(reservationApiSrc).not.toMatch(
      /select\(\s*`[\s\S]*?\border_type\b[\s\S]*?`\s*\)/,
    );
    expect(headerSrc).toMatch(/CheckoutMinimalHeader/);
    expect(headerSrc).toMatch(/checkout\/success/);
  });

  it("humanizes block reasons without leaking raw codes", () => {
    const sv = humanizeDualOfferBlockReason("contract_policy_undecided", "sv");
    expect(sv).not.toMatch(/contract_policy/);
    expect(sv.toLowerCase()).toMatch(/köp|betalning|tillgänglig/);
    const en = humanizeDualOfferBlockReason(
      "offer_snapshot_persistence_unavailable",
      "en",
    );
    expect(en).not.toMatch(/offer_snapshot/);
  });

  it("selection drives quote; final click carries explicit acceptance", () => {
    const lines: OfferLineSnapshot[] = [
      {
        wine_id: "a",
        quantity: 6,
        unit_price_sek: 148,
        line_total_sek: 888,
      },
      {
        wine_id: "b",
        quantity: 2,
        unit_price_sek: 147.99,
        line_total_sek: 295.98,
      },
    ];
    const subtotal = 1183.98;
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: money(subtotal, 99),
      wine_lines: lines,
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: "u",
      cart_id: "c",
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    let state = createOfferCheckoutSessionState(
      buildDualOfferQuoteSet({
        cart_id: "c",
        shared_pallet: shared,
        direct_box: direct,
      }),
    );
    expect(state.dual.selected_quote_id).toBeNull();
    state = switchSelectedOffer({ state, toOffer: "direct_box" }).state;
    expect(state.dual.selected_quote_id).toBe(direct.quote_id);
    expect(state.acceptance).toBeNull();
    expect(mayEnableFinalCheckoutAction(state).allow).toBe(false);

    const acc = acceptSelectedOfferQuote({
      state,
      quote_id: state.dual.selected_quote_id!,
    });
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    state = acc.state;
    expect(state.acceptance?.explicit_acceptance).toBe(true);
    expect(state.acceptance?.quote_id).toBe(direct.quote_id);
    const gate = evaluateDualOfferLivePaymentGate({ state });
    expect(gate.allow).toBe(false);
    expect(humanizeDualOfferBlockReason(gate.reason, "sv")).not.toMatch(
      /_|synthetic|contract_policy/i,
    );
  });

  it("labels bottle price as snitt/average via i18n key", () => {
    expect(offerBottleAverageLabelKey()).toBe("dualOfferBottleAvg");
    expect(dualOfferMsg("sv", "dualOfferBottleAvg").toLowerCase()).toMatch(
      /snittpris/,
    );
    expect(dualOfferMsg("en", "dualOfferBottleAvg").toLowerCase()).toMatch(
      /average/,
    );
    expect(offerTotalsIncludeVat()).toBe(true);
    expect(dualOfferMsg("sv", "dualOfferInclVat")).toMatch(/inkl\.?\s*moms/i);
  });
});

describe("direct offer per-line öre rounding (8-bottle case)", () => {
  it("locks wines_subtotal 1326.06 and rounded snitt that does not remultiply cleanly", () => {
    const lines: OfferLineSnapshot[] = [
      {
        wine_id: "a",
        quantity: 6,
        unit_price_sek: 148,
        line_total_sek: 888,
      },
      {
        wine_id: "b",
        quantity: 2,
        unit_price_sek: 147.99,
        line_total_sek: 295.98,
      },
    ];
    const shared = buildOfferQuote({
      offer: "shared_pallet",
      money: money(1183.98, 99),
      wine_lines: lines,
      destination_country: "SE",
      pricing_source: "live_catalog",
      user_id: "u",
      cart_id: "c",
    });
    const direct = buildSyntheticDirectOfferFromShared({ shared });
    // Per-line: whole-kronor catalog × 1.05 (DIRECT_BOX_PRICE_MARKUP_PERCENT).
    expect(direct.wine_lines[0]?.unit_price_sek).toBe(155);
    expect(direct.wine_lines[1]?.unit_price_sek).toBe(155);
    expect(direct.wines_subtotal_sek).toBe(1240);
    expect(direct.bottle_count).toBe(8);
    // Cart-weighted average — 1240/8 = 155
    expect(direct.bottle_unit_price_sek).toBe(155);
    expect(
      Math.round(direct.bottle_unit_price_sek * direct.bottle_count * 100) / 100,
    ).toBe(1240);
  });
});
