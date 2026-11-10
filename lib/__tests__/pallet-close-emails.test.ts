import { describe, expect, it } from "vitest";
import {
  buildPalletClosedChargedEmail,
  buildPalletCloseCancelledEmail,
  buildPalletCloseChoiceEmail,
  buildPalletClosePaymentFailedEmail,
} from "@/lib/checkout/pallet-close/emails";

describe("pallet-close email builders", () => {
  it("builds Swedish charged email with Geist font stack", () => {
    const m = buildPalletClosedChargedEmail({
      locale: "sv",
      customerName: "Inès",
      reservationId: "res-1",
      amountSek: 1290,
      palletName: "Stockholm A",
    });
    expect(m.subject).toBe("Pallen har stängt – betalningen är klar");
    expect(m.html).toContain("font-family:Geist");
    expect(m.html).toContain("1\u202F290 kr");
    expect(m.text).toContain("1\u202F290 kr");
    expect(m.html + m.text).not.toContain("Stockholm A");
    expect(m.html).toContain("pactwines.com/profile/reservations");
    expect(m.html).not.toContain("localhost");
    expect(m.html).toContain("Se din order");
    expect(m.html).toContain("border-radius:4px");
    expect(m.html).toContain("Tartu mnt 67/1-13b");
    expect(m.text).toContain("Vi mejlar dig när pallen har skickats");
    expect(m.text).toContain("inom 30 dagar");
  });

  it("builds English choice email with wait/cancel/direct links", () => {
    const m = buildPalletCloseChoiceEmail({
      locale: "en",
      customerName: "Alex",
      reservationId: "res-1",
      replyByLabel: "8 December 2026",
      waitUrl: "https://pactwines.com/pallet-close/wait?token=w",
      cancelUrl: "https://pactwines.com/pallet-close/cancel?token=c",
      switchDirectUrl: "https://pactwines.com/pallet-close/switch-direct?token=s",
    });
    expect(m.subject.toLowerCase()).toContain("deadline");
    expect(m.html).toContain("Wait longer");
    expect(m.html).toContain("Cancel at no cost");
    expect(m.html).toContain("Switch to direct");
    expect(m.text).toContain("token=w");
  });

  it("omits direct option when URL absent", () => {
    const m = buildPalletCloseChoiceEmail({
      locale: "sv",
      customerName: "Alex",
      reservationId: "res-1",
      replyByLabel: "8 december 2026",
      waitUrl: "https://x/w",
      cancelUrl: "https://x/c",
    });
    expect(m.html).not.toContain("direktleverans");
    expect(m.text).not.toContain("direktleverans");
  });

  it("builds cancellation copy for timeout reasons (order wording)", () => {
    const m = buildPalletCloseCancelledEmail({
      locale: "sv",
      customerName: "Alex",
      reservationId: "res-1",
      reason: "choice_timeout",
    });
    expect(m.subject).toMatch(/order är avbruten/i);
    expect(m.text).toMatch(/7 dagar/i);
    expect(m.text).toContain("pactwines.com");
    expect(m.text).not.toContain("pact.wine");
    expect(m.html).toContain("font-family:Geist");
  });

  it("builds payment-failed email with 3-day pay link", () => {
    const m = buildPalletClosePaymentFailedEmail({
      locale: "en",
      customerName: "Alex",
      reservationId: "res-1",
      payByLabel: "4 December 2026",
      paymentLinkUrl: "https://checkout.stripe.com/c/pay/cs_test",
    });
    expect(m.subject).toBe("We couldn't take payment");
    expect(m.html).toContain("checkout.stripe.com");
    expect(m.html).toContain("font-family:Geist");
    expect(m.html).toContain("border-radius:4px");
    expect(m.text).toContain("3 days");
    expect(m.text).toContain("order will be cancelled");
    expect(m.text).not.toContain("reservation is cancelled");
  });

  it("cancel confirm uses future-pallet copy and no coupon/points line", () => {
    const m = buildPalletCloseCancelledEmail({
      locale: "sv",
      customerName: "Alex",
      reservationId: "res-1",
      reason: "customer_cancel",
    });
    expect(m.text).toContain(
      "Vill du vara med på en kommande pall hittar du de öppna pallarna på pactwines.com.",
    );
    expect(m.text).not.toContain("PACT Points");
    expect(m.text).not.toContain("kupong");
    expect(m.html).toContain("Se din order");
  });
});
