import { describe, expect, it } from "vitest";
import {
  buildPaymentCancelledText,
  buildPaymentConfirmedHtml,
  buildPaymentConfirmedText,
  buildPaymentFailedHtml,
  buildPaymentFailedText,
  isCollectablePaymentUrl,
  shouldSendPaymentConfirmedEmail,
} from "@/lib/sendgrid-service";
import {
  buildPalletClosedChargedEmail,
  buildPalletCloseCancelledEmail,
  buildPalletClosePaymentFailedEmail,
} from "@/lib/checkout/pallet-close/emails";
import { buildPalletShippedEmail } from "@/lib/checkout/pallet-delivery-notify/emails";
import {
  formatOrderAmountSek,
  orderEmailFooterLine,
} from "@/lib/email/order-email-chrome";

describe("v3 review — payment confirmed vs charged (1)", () => {
  it("skips payment_confirmed for shared-pallet (pallet_id set)", () => {
    expect(shouldSendPaymentConfirmedEmail({ palletId: "pal-1" })).toBe(false);
    expect(shouldSendPaymentConfirmedEmail({ palletId: null })).toBe(true);
    expect(shouldSendPaymentConfirmedEmail({})).toBe(true);
  });

  it("payment confirmed uses shared chrome, formatted amount, no pallet name", () => {
    const html = buildPaymentConfirmedHtml({
      reservationId: "ord-1",
      amountSek: 1250,
      locale: "en",
      customerName: "Alex",
      palletName: "Stockholm A",
    });
    const text = buildPaymentConfirmedText({
      reservationId: "ord-1",
      amountSek: 1250,
      locale: "en",
      customerName: "Alex",
      palletName: "Stockholm A",
    });
    expect(html).toContain("font-family:Geist");
    expect(html).toContain("SEK 1,250");
    expect(html).toContain("Tartu mnt 67/1-13b");
    expect(html + text).not.toContain("Stockholm A");
    expect(html + text).not.toContain("Pallet:");
    expect(text).toContain(orderEmailFooterLine("en", "ord-1"));
  });
});

describe("v3 review — failed-charge amount (2)", () => {
  it("buildPalletClosePaymentFailedEmail shows formatOrderAmountSek", () => {
    const m = buildPalletClosePaymentFailedEmail({
      locale: "sv",
      customerName: "Anna",
      reservationId: "ord-1",
      payByLabel: "13 november 2026",
      paymentLinkUrl: "https://checkout.stripe.com/c/pay/cs_test",
      amountSek: 1250,
    });
    expect(m.text).toContain(formatOrderAmountSek(1250, "sv"));
    expect(m.html).toContain("1\u202F250 kr");
    expect(m.text).not.toContain("dra beloppet från");
    expect(m.html).toContain("checkout.stripe.com");
  });

  it("sendgrid failed builder uses amount when provided", () => {
    const text = buildPaymentFailedText({
      reservationId: "ord-1",
      customerName: "Alex",
      amountSek: 1250,
      payByLabel: "13 November 2026",
      paymentUrl: "https://checkout.stripe.com/c/pay/cs_test",
      locale: "en",
    });
    expect(text).toContain("SEK 1,250");
    expect(text).not.toContain("the amount");
  });
});

describe("v3 review — text/plain Juliette footer (4)", () => {
  it("charged / shipped / failed / cancelled / cancel-confirm include full footer", () => {
    const charged = buildPalletClosedChargedEmail({
      locale: "sv",
      customerName: "Anna",
      reservationId: "ord-1",
      amountSek: 1250,
    });
    const shipped = buildPalletShippedEmail({
      locale: "en",
      customerName: "Alex",
      reservationId: "ord-1",
      windowStart: "2026-05-12",
      windowEnd: "2026-05-18",
    });
    const failed = buildPalletClosePaymentFailedEmail({
      locale: "sv",
      customerName: "Anna",
      reservationId: "ord-1",
      payByLabel: "13 november 2026",
      paymentLinkUrl: "https://checkout.stripe.com/c/pay/cs_test",
      amountSek: 1250,
    });
    const payCancel = buildPaymentCancelledText({
      reservationId: "ord-1",
      reason: "x",
      locale: "en",
      customerName: "Alex",
    });
    const cancelConfirm = buildPalletCloseCancelledEmail({
      locale: "sv",
      customerName: "Anna",
      reservationId: "ord-1",
      reason: "customer_cancel",
    });

    expect(charged.text).toContain(orderEmailFooterLine("sv", "ord-1"));
    expect(shipped.text).toContain(orderEmailFooterLine("en", "ord-1"));
    expect(failed.text).toContain(orderEmailFooterLine("sv", "ord-1"));
    expect(payCancel).toContain(orderEmailFooterLine("en", "ord-1"));
    expect(cancelConfirm.text).toContain(orderEmailFooterLine("sv", "ord-1"));
  });
});

describe("v3 review — no /profile#payment fallback (5)", () => {
  it("rejects profile#payment as collectable", () => {
    expect(isCollectablePaymentUrl("https://pactwines.com/profile#payment")).toBe(
      false,
    );
    expect(isCollectablePaymentUrl("")).toBe(false);
    expect(
      isCollectablePaymentUrl("https://checkout.stripe.com/c/pay/cs_test"),
    ).toBe(true);
  });

  it("omits pay CTA when URL is profile#payment", () => {
    const html = buildPaymentFailedHtml({
      reservationId: "ord-1",
      payByLabel: "13 november 2026",
      paymentUrl: "https://pactwines.com/profile#payment",
      locale: "sv",
      amountSek: 1250,
    });
    expect(html).not.toContain("Betala nu");
    expect(html).not.toContain("profile#payment");
  });
});
