import { describe, expect, it } from "vitest";
import {
  checkoutChargeTimingMessageKey,
  checkoutPaymentModeMatchesChannel,
  checkoutPlaceOrderCtaMessageKey,
  expectedCheckoutPaymentMode,
} from "@/lib/checkout/charge-timing-copy";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("expectedCheckoutPaymentMode", () => {
  it("maps direct_box to payment_intent and shared_pallet to setup_intent", () => {
    expect(
      expectedCheckoutPaymentMode({ fulfillmentChannel: "direct_box" }),
    ).toBe("payment_intent");
    expect(
      expectedCheckoutPaymentMode({ fulfillmentChannel: "shared_pallet" }),
    ).toBe("setup_intent");
  });

  it("treats a mismatched live Stripe mode as not ready for the channel", () => {
    expect(
      checkoutPaymentModeMatchesChannel({
        paymentMode: "setup_intent",
        fulfillmentChannel: "direct_box",
      }),
    ).toBe(false);
    expect(
      checkoutPaymentModeMatchesChannel({
        paymentMode: "payment_intent",
        fulfillmentChannel: "shared_pallet",
      }),
    ).toBe(false);
    expect(
      checkoutPaymentModeMatchesChannel({
        paymentMode: null,
        fulfillmentChannel: "direct_box",
      }),
    ).toBe(false);
    expect(
      checkoutPaymentModeMatchesChannel({
        paymentMode: "payment_intent",
        fulfillmentChannel: "direct_box",
      }),
    ).toBe(true);
  });

  it("channel-expected mode drives direct copy even before Stripe reports", () => {
    const expected = expectedCheckoutPaymentMode({
      fulfillmentChannel: "direct_box",
    });
    expect(checkoutChargeTimingMessageKey({ paymentMode: expected })).toBe(
      "chargedOnConfirm",
    );
    expect(checkoutPlaceOrderCtaMessageKey({ paymentMode: expected })).toEqual({
      key: "payNow",
      needsAmount: false,
    });
  });
});

describe("checkoutChargeTimingMessageKey", () => {
  it("uses immediate-charge copy for payment_intent (Pay now path)", () => {
    expect(
      checkoutChargeTimingMessageKey({ paymentMode: "payment_intent" }),
    ).toBe("chargedOnConfirm");
    expect(
      checkoutChargeTimingMessageKey({
        paymentMode: "payment_intent",
        isUsConditional: false,
      }),
    ).toBe("chargedOnConfirm");
  });

  it("uses deferred pallet-close copy for shared-pallet setup_intent", () => {
    expect(
      checkoutChargeTimingMessageKey({ paymentMode: "setup_intent" }),
    ).toBe("noChargeUntilPalletCloses");
  });

  it("omits pallet-close claim for US conditional setup_intent", () => {
    expect(
      checkoutChargeTimingMessageKey({
        paymentMode: "setup_intent",
        isUsConditional: true,
      }),
    ).toBeNull();
  });

  it("renders no charge-timing claim while mode is unknown/loading", () => {
    expect(checkoutChargeTimingMessageKey({ paymentMode: null })).toBeNull();
    expect(
      checkoutChargeTimingMessageKey({ paymentMode: undefined }),
    ).toBeNull();
  });
});

describe("checkoutPlaceOrderCtaMessageKey", () => {
  it("uses Pay now for payment_intent", () => {
    expect(
      checkoutPlaceOrderCtaMessageKey({ paymentMode: "payment_intent" }),
    ).toEqual({ key: "payNow", needsAmount: false });
  });

  it("uses deferred-timing CTA for shared-pallet setup_intent", () => {
    expect(
      checkoutPlaceOrderCtaMessageKey({ paymentMode: "setup_intent" }),
    ).toEqual({ key: "placeReservationWithPayment", needsAmount: true });
  });

  it("uses US conditional CTA without pallet-close wording key", () => {
    expect(
      checkoutPlaceOrderCtaMessageKey({
        paymentMode: "setup_intent",
        isUsConditional: true,
      }),
    ).toEqual({ key: "usConditionalButton", needsAmount: false });
  });

  it("unknown/loading/error CTA has no timing promise", () => {
    expect(
      checkoutPlaceOrderCtaMessageKey({ paymentMode: null }),
    ).toEqual({ key: "placeReservation", needsAmount: false });
    expect(
      checkoutPlaceOrderCtaMessageKey({ paymentMode: undefined }),
    ).toEqual({ key: "placeReservation", needsAmount: false });
  });

  it("submitting overrides to processing", () => {
    expect(
      checkoutPlaceOrderCtaMessageKey({
        paymentMode: "payment_intent",
        isSubmitting: true,
      }),
    ).toEqual({ key: "processing", needsAmount: false });
  });
});

describe("checkout charge-timing wiring", () => {
  it("checkout footer and CTA use model-aware helpers", () => {
    const checkout = readFileSync(
      join(__dirname, "../../app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(checkout).toContain("checkoutChargeTimingMessageKey");
    expect(checkout).toContain("chargeTimingCopyKey");
    expect(checkout).toContain("checkoutPlaceOrderCtaMessageKey");
    expect(checkout).toContain("placeOrderCta");
    expect(checkout).toContain("expectedCheckoutPaymentMode");
    expect(checkout).toContain("checkoutPaymentModeMatchesChannel");
    expect(checkout).toContain("data-checkout-charge-timing");
    expect(checkout).toContain("data-checkout-place-cta");
    // Must not still hardcode deferred string as the only footer line
    expect(checkout).not.toMatch(
      /\{\s*t\("checkout\.noChargeUntilPalletCloses"\)\s*\}/,
    );
    // Unknown path must not fall through to timing CTA when mode is unset
    expect(checkout).not.toMatch(
      /paymentMode === "payment_intent"\s*\?\s*t\("checkout\.payNow"\)\s*:\s*isUsConditional/,
    );
  });

  it("stripe payment section clears intent UI when fulfillment channel changes", () => {
    const stripe = readFileSync(
      join(__dirname, "../../components/checkout/stripe-payment-section.tsx"),
      "utf8",
    );
    expect(stripe).toContain("fulfillmentChannel");
    // Channel/context change must drop the previous secret so pallet copy
    // cannot linger while the matching intent reloads.
    expect(stripe).toMatch(
      /fulfillmentChannel[\s\S]*setClientSecret\(null\)[\s\S]*setPaymentMode\(null\)/,
    );
    expect(stripe).toMatch(/loading && !clientSecret/);
  });

  it("sv/en timing strings and CTA keys stay model-safe", () => {
    const en = JSON.parse(
      readFileSync(join(__dirname, "../../messages/en.json"), "utf8"),
    );
    const sv = JSON.parse(
      readFileSync(join(__dirname, "../../messages/sv.json"), "utf8"),
    );
    expect(en.checkout.chargedOnConfirm).toMatch(/charged now|confirm/i);
    expect(sv.checkout.chargedOnConfirm).toMatch(/debiteras nu|bekräftar/i);
    expect(en.checkout.noChargeUntilPalletCloses).toMatch(
      /not charged now|pallet closes/i,
    );
    expect(sv.checkout.noChargeUntilPalletCloses).toMatch(
      /Inget dras nu|pallen stänger/i,
    );
    expect(en.checkout.chargedOnConfirm).not.toMatch(
      /pallet closes|not charged now/i,
    );
    expect(sv.checkout.chargedOnConfirm).not.toMatch(
      /pallen stänger|Inget dras nu/i,
    );
    // Unknown CTA must not embed timing promise
    expect(en.checkout.placeReservation).not.toMatch(
      /pallet closes|charged|authorize payment/i,
    );
    expect(sv.checkout.placeReservation).not.toMatch(
      /pallen stänger|debiter|godkänn betalning/i,
    );
    // SI CTA may keep deferred timing (known setup_intent only)
    expect(en.checkout.placeReservationWithPayment).toMatch(/pallet closes/i);
    expect(sv.checkout.placeReservationWithPayment).toMatch(/pallen stänger/i);
    // Neutral Stripe reload copy (AC2) — short, no mode promise
    expect(en.checkout.loadingPayment).toMatch(/loading payment/i);
    expect(sv.checkout.loadingPayment).toMatch(/Laddar betalning/i);
    expect(en.checkout.loadingPayment).not.toMatch(/pallet|pay now|charged/i);
    expect(sv.checkout.loadingPayment).not.toMatch(
      /pallen|Betala nu|debiteras|Inget dras/i,
    );
  });

  it("checkout and stripe section surface loadingPayment while intent reloads", () => {
    const checkout = readFileSync(
      join(__dirname, "../../app/checkout/checkout-client.tsx"),
      "utf8",
    );
    const stripe = readFileSync(
      join(__dirname, "../../components/checkout/stripe-payment-section.tsx"),
      "utf8",
    );
    expect(checkout).toContain('t("checkout.loadingPayment")');
    expect(checkout).toContain("data-testid=\"checkout-payment-reloading\"");
    expect(stripe).toContain('t("checkout.loadingPayment")');
    expect(stripe).toContain('data-testid="checkout-stripe-loading"');
  });

  it("place CTA button classes allow wrap at narrow widths", () => {
    const checkout = readFileSync(
      join(__dirname, "../../app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(checkout).toMatch(/data-checkout-place-cta[\s\S]*whitespace-normal/);
    expect(checkout).toMatch(/data-checkout-place-cta[\s\S]*break-words/);
    expect(checkout).toMatch(/data-checkout-place-cta[\s\S]*h-auto/);
  });
});
