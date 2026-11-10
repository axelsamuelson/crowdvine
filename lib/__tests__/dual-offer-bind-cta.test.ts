import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSharedPalletBindCopy,
} from "@/components/checkout/dual-offer-checkout-panel";
import { dualOfferMsg } from "@/lib/checkout/dual-offer-customer-copy";
import {
  localizeCartDiscountLabel,
  formatCartDiscountLabel,
} from "@/lib/cart/discount-label";
import { formatOfferSek } from "@/lib/checkout/dual-offer-display";
import {
  mayStartSharedPalletCardSave,
} from "@/lib/checkout/dual-offer-checkout-isolation";

describe("dual-offer binding CTA (distance-selling)", () => {
  const panelSrc = readFileSync(
    resolve(process.cwd(), "components/checkout/dual-offer-checkout-panel.tsx"),
    "utf8",
  );
  const checkoutSrc = readFileSync(
    resolve(process.cwd(), "app/checkout/checkout-client.tsx"),
    "utf8",
  );

  it("continue CTA labels are non-binding", () => {
    expect(dualOfferMsg("sv", "dualOfferContinueToCard")).toBe(
      "Fortsätt till kortuppgifter",
    );
    expect(dualOfferMsg("en", "dualOfferContinueToCard")).toBe(
      "Continue to card details",
    );
  });

  it("final bind CTA states payment obligation with kr/SEK in total", () => {
    const sv = buildSharedPalletBindCopy({
      locale: "sv",
      totalSek: 1283,
      chargeDeadlineAt: "2026-12-07T00:00:00.000Z",
      showDirectOffer: false,
    });
    expect(sv.finalCtaLabel.replace(/\u00a0/g, " ")).toBe(
      "Köp – betala 1 283 kr när pallen stänger",
    );
    expect(sv.legalLine).toMatch(/Köpet är bindande/);
    expect(sv.totalInclLine.replace(/\u00a0/g, " ")).toMatch(/1 283 kr/);

    const en = buildSharedPalletBindCopy({
      locale: "en",
      totalSek: 1283,
      chargeDeadlineAt: "2026-12-07T00:00:00.000Z",
      showDirectOffer: false,
    });
    expect(en.finalCtaLabel.replace(/\u00a0/g, " ")).toBe(
      "Buy – pay 1 283 SEK when the pallet closes",
    );
    expect(en.legalLine).toMatch(/The purchase is binding/);
  });

  it("first continue click does not call place-reservation / confirm SI", () => {
    // Panel continue path only accepts quote + unlocks card step.
    expect(panelSrc).toMatch(/onContinueToCard/);
    expect(panelSrc).toMatch(/variant: \"continue\"/);
    expect(panelSrc).not.toMatch(
      /onContinueToCard[\s\S]{0,200}handlePlaceReservation/,
    );
    expect(panelSrc).not.toMatch(
      /onContinueToCard[\s\S]{0,200}onConfirmSharedPalletPurchase/,
    );
    // Binding model is null while unlocked (CTA moves after PE).
    expect(panelSrc).toMatch(/if \(cardStepUnlocked\) return null/);
  });

  it("checkout mounts bind CTA after Payment Element with complete gate", () => {
    expect(checkoutSrc).toMatch(/dual-offer-continue-sticky/);
    expect(checkoutSrc).toMatch(/!dualOfferCardStepUnlocked/);
    expect(checkoutSrc).toMatch(/paymentElementComplete/);
    expect(checkoutSrc).toMatch(/variant: \"bind\"/);
    expect(checkoutSrc).toMatch(/onPaymentElementComplete/);
    expect(checkoutSrc).toMatch(/buildSharedPalletBindCopy/);
  });

  it("blocked cart (<6 bottles) disables Fortsätt + bind and blocks SetupIntent", () => {
    // Continue CTA: cart minimum gates purchase + helper reuses orderBlocked copy.
    expect(panelSrc).toMatch(/cartMinimumMet/);
    expect(panelSrc).toMatch(/!cartMinimumMet/);
    expect(panelSrc).toMatch(/cartBlockedNote/);
    expect(checkoutSrc).toMatch(/cartMinimumMet=\{isValidCart\}/);
    expect(checkoutSrc).toMatch(/checkout\.orderBlocked/);
    expect(checkoutSrc).toMatch(/checkout\.addBottlesRequirement/);
    // Bind CTA must include !isValidCart in disabled expression.
    expect(checkoutSrc).toMatch(
      /const bindDisabled =\s*!isValidCart \|\|/s,
    );
    // Card-step unlock + SI prefetch refused while blocked.
    expect(checkoutSrc).toMatch(
      /handleSharedPalletCardStepRequest[\s\S]*?if \(!isValidCart\) return/,
    );
    expect(checkoutSrc).toMatch(/if \(!isValidCart\) \{\s*setPrefetchedStripeIntent\(null\)/s);
    // Final Köp only mounts after card-step unlock — unreachable while blocked.
    expect(checkoutSrc).toMatch(
      /dualOfferCardStepUnlocked &&\s*dualOfferSelectedQuote &&\s*mayStartSharedPalletCardSave/s,
    );
  });

  it("live shared pallet may start card save; synthetic may not", () => {
    expect(
      mayStartSharedPalletCardSave({
        offer: "shared_pallet",
        pricing_source: "live_catalog",
      }),
    ).toBe(true);
    expect(
      mayStartSharedPalletCardSave({
        offer: "shared_pallet",
        pricing_source: "synthetic_fixture",
      }),
    ).toBe(false);
  });
});

describe("SV Early bird + EN SEK display", () => {
  it("localizes Early bird → Tidig bokning in SV UI", () => {
    expect(
      localizeCartDiscountLabel("Early bird −20 %", "sv"),
    ).toBe("Tidig bokning −20 %");
    expect(
      formatCartDiscountLabel({
        memberName: null,
        memberPercent: 0,
        earlyBirdPercent: 20,
        locale: "sv",
      }),
    ).toBe("Tidig bokning −20 %");
  });

  it("EN bottle average uses SEK not kr", () => {
    const s = formatOfferSek(148, "en");
    expect(s).toBe("148 SEK");
    expect(s).not.toMatch(/kr/i);
  });
});
