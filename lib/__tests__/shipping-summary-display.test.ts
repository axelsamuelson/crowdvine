import { describe, expect, it } from "vitest";
import {
  checkoutCtaMissingPostalHintKey,
  resolveCheckoutShippingSummaryDisplay,
  resolveCheckoutSummaryTotalSek,
  resolveFillPostalCtaSurface,
  shippingSummaryUnavailableMessageKey,
  shouldRenderPreStep4PurchaseButton,
} from "@/lib/checkout/shipping-summary-display";

describe("resolveCheckoutShippingSummaryDisplay", () => {
  it("asks for postal before anything else", () => {
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: false,
        loading: false,
        shippingSek: 99,
      }),
    ).toEqual({ kind: "after_postal" });
  });

  it("shows loading skeleton only while rates/zone are in flight", () => {
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: true,
        loading: true,
        shippingSek: null,
      }),
    ).toEqual({ kind: "loading" });
  });

  it("shows Stockholm shared-pallet amount when quoted", () => {
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: true,
        loading: false,
        shippingSek: 99,
      }),
    ).toEqual({ kind: "amount", shippingSek: 99 });
  });

  it("shows free when configured shipping is zero", () => {
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: true,
        loading: false,
        shippingSek: 0,
      }),
    ).toEqual({ kind: "free" });
  });

  it("Kiruna / out_of_zone: never leaves the row empty — explains unavailable", () => {
    // Cause: postal outside shared-pallet geo zone → no matched rate for the
    // selected channel; UI must not hide the Leverans/Frakt row.
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: true,
        loading: false,
        shippingSek: null,
        channelUnavailable: true,
        sharedUnavailableReason: "out_of_zone",
      }),
    ).toEqual({ kind: "unavailable", reason: "out_of_zone" });
  });

  it("Kiruna with no remaining channel: no_fulfillment copy", () => {
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: true,
        loading: false,
        shippingSek: null,
        noFulfillmentAvailable: true,
      }),
    ).toEqual({ kind: "unavailable", reason: "no_fulfillment" });
  });

  it("postal known but rate missing after load → no_rate (not skeleton)", () => {
    expect(
      resolveCheckoutShippingSummaryDisplay({
        hasPostalCode: true,
        loading: false,
        shippingSek: null,
      }),
    ).toEqual({ kind: "unavailable", reason: "no_rate" });
  });

  it("maps unavailable reasons to existing i18n keys", () => {
    expect(shippingSummaryUnavailableMessageKey("out_of_zone")).toBe(
      "sharedPalletPostalUnavailable",
    );
    expect(shippingSummaryUnavailableMessageKey("budbee_unavailable")).toBe(
      "sharedPalletPostalBudbeeUnavailable",
    );
    expect(shippingSummaryUnavailableMessageKey("no_fulfillment")).toBe(
      "shippingNotAvailable",
    );
    expect(shippingSummaryUnavailableMessageKey("no_rate")).toBe(
      "shippingUnavailableForPostal",
    );
  });
});

describe("checkoutCtaMissingPostalHintKey", () => {
  it("explains next step when postal is missing (hint text, not a button)", () => {
    expect(
      checkoutCtaMissingPostalHintKey({ hasPostalCode: false }),
    ).toBe("fillPostalToContinue");
  });

  it("stays quiet once postal is filled", () => {
    expect(
      checkoutCtaMissingPostalHintKey({ hasPostalCode: true }),
    ).toBeNull();
  });

  it("does not override cart-minimum helper copy", () => {
    expect(
      checkoutCtaMissingPostalHintKey({
        hasPostalCode: false,
        cartMinimumBlocks: true,
      }),
    ).toBeNull();
  });
});

describe("resolveFillPostalCtaSurface / pre-step-4 Betala nu (Inès)", () => {
  it("before postal: hint_only — never a gray purchase button", () => {
    expect(
      resolveFillPostalCtaSurface({ hasPostalCode: false }),
    ).toEqual({ kind: "hint_only", hintKey: "fillPostalToContinue" });
    expect(shouldRenderPreStep4PurchaseButton()).toBe(false);
  });

  it("after postal: no fill-postal surface", () => {
    expect(
      resolveFillPostalCtaSurface({ hasPostalCode: true }),
    ).toEqual({ kind: "none" });
  });
});

describe("resolveCheckoutSummaryTotalSek", () => {
  it("Kiruna / no fulfillment: total is subtotal excl. shipping (never +99)", () => {
    expect(
      resolveCheckoutSummaryTotalSek({
        shippingSummary: { kind: "unavailable", reason: "no_fulfillment" },
        boundQuoteTotalSek: 1131,
        subtotalSek: 1032,
        shippingSek: 99,
      }),
    ).toEqual({ amountSek: 1032, exclShipping: true });
  });

  it("before postal: shows subtotal excl. shipping (no endless skeleton)", () => {
    expect(
      resolveCheckoutSummaryTotalSek({
        shippingSummary: { kind: "after_postal" },
        subtotalSek: 1032,
        shippingSek: null,
      }),
    ).toEqual({ amountSek: 1032, exclShipping: true });
  });

  it("while shipping loads: known subtotal stays visible excl. shipping", () => {
    expect(
      resolveCheckoutSummaryTotalSek({
        shippingSummary: { kind: "loading" },
        subtotalSek: 1032,
        shippingSek: null,
      }),
    ).toEqual({ amountSek: 1032, exclShipping: true });
  });

  it("Stockholm with quoted shipping: includes shipping in total", () => {
    expect(
      resolveCheckoutSummaryTotalSek({
        shippingSummary: { kind: "amount", shippingSek: 99 },
        subtotalSek: 1032,
        shippingSek: 99,
      }),
    ).toEqual({ amountSek: 1131, exclShipping: false });
  });

  it("direct-box amount uses shipping fee", () => {
    expect(
      resolveCheckoutSummaryTotalSek({
        shippingSummary: { kind: "amount", shippingSek: 149 },
        subtotalSek: 1084,
        shippingSek: 149,
      }),
    ).toEqual({ amountSek: 1233, exclShipping: false });
  });
});
