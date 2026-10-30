import { describe, expect, it } from "vitest";

import {
  checkoutCommitMessageKey,
  checkoutCommitMessageNeedsAmount,
} from "@/lib/checkout/commit-button-label";
import { translate } from "@/lib/i18n/messages";
import { formatMoney } from "@/lib/shopping-context/format";

describe("checkoutCommitMessageKey", () => {
  it("uses processing while submitting", () => {
    expect(
      checkoutCommitMessageKey({
        isSubmitting: true,
        paymentMode: "setup_intent",
        isUsConditional: false,
      }),
    ).toBe("checkout.processing");
  });

  it("uses pay-now for immediate payment_intent charges", () => {
    expect(
      checkoutCommitMessageKey({
        isSubmitting: false,
        paymentMode: "payment_intent",
        isUsConditional: false,
      }),
    ).toBe("checkout.payNow");
  });

  it("uses the US conditional key when applicable", () => {
    expect(
      checkoutCommitMessageKey({
        isSubmitting: false,
        paymentMode: "setup_intent",
        isUsConditional: true,
      }),
    ).toBe("checkout.usConditionalButton");
  });

  it("defaults to reserve-with-payment for deferred pallet reservations", () => {
    expect(
      checkoutCommitMessageKey({
        isSubmitting: false,
        paymentMode: "setup_intent",
        isUsConditional: false,
      }),
    ).toBe("checkout.placeReservationWithPayment");
  });
});

describe("Swedish button-solution copy", () => {
  it("states betalningsskyldighet and includes the live amount for deferred reservation", () => {
    const amount = formatMoney(1234, "SEK", "sv").replace(/\u00a0/g, " ");
    const label = translate("sv", "checkout.placeReservationWithPayment", {
      amount,
    }).replace(/\u00a0/g, " ");

    expect(label).toBe(`Reservera med betalningsskyldighet – ${amount}`);
    expect(label).toContain("betalningsskyldighet");
    expect(label).toContain("1 234 kr");
  });

  it("states Beställ och betala with the live amount for immediate pay", () => {
    const amount = formatMoney(990, "SEK", "sv").replace(/\u00a0/g, " ");
    const label = translate("sv", "checkout.payNow", { amount }).replace(
      /\u00a0/g,
      " ",
    );

    expect(label).toBe(`Beställ och betala ${amount}`);
    expect(label).toContain("990 kr");
  });

  it("keeps the amount correct when the total changes with quantity", () => {
    const key = checkoutCommitMessageKey({
      isSubmitting: false,
      paymentMode: "setup_intent",
      isUsConditional: false,
    });
    expect(checkoutCommitMessageNeedsAmount(key)).toBe(true);

    const oneBottle = translate("sv", key, {
      amount: formatMoney(250, "SEK", "sv"),
    }).replace(/\u00a0/g, " ");
    const twoBottles = translate("sv", key, {
      amount: formatMoney(500, "SEK", "sv"),
    }).replace(/\u00a0/g, " ");

    expect(oneBottle).toContain("250 kr");
    expect(twoBottles).toContain("500 kr");
    expect(oneBottle).not.toBe(twoBottles);
  });

  it("formats the 3DS recovery pay button with obligation wording and amount", () => {
    const amount = formatMoney(1875, "SEK", "sv").replace(/\u00a0/g, " ");
    const label = translate("sv", "checkout.verifyAndPay", { amount }).replace(
      /\u00a0/g,
      " ",
    );
    expect(label).toBe(`Beställ och betala ${amount}`);
    expect(label).toContain("1 875 kr");
  });
});
