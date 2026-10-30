import { describe, expect, it } from "vitest";
import {
  checkoutCustomerShippingCharge,
  normalizeCheckoutShippingCountry,
  resolveCheckoutShippingCountry,
} from "@/lib/checkout/resolve-checkout-shipping";
import {
  formatCheckoutShippingLabel,
  resolveCheckoutShippingLabelState,
} from "@/lib/checkout/shipping-label";
import { resolveCustomerShippingQuote } from "@/lib/customer-shipping-pricing";
import {
  formatDisplayMoney,
  formatSekAsDisplayMoney,
} from "@/lib/shopping-context/format";
import { fallbackSekToDisplayRate } from "@/lib/shopping-context/currency-policy";

/** Authorized PACT Sweden production rate: 99 SEK inkl moms / order. */
const PACT_SE_99 = [
  {
    id: "a0610408-3daf-44b4-8e9b-a2c5f74de2d4",
    channel: "pact" as const,
    countryCode: "SE",
    flatFeeCents: 9900,
    freeShipping: false,
    freeShippingThresholdCents: null,
    minBottles: null,
    maxBottles: null,
    active: true,
    validFrom: null,
    validTo: null,
  },
];

describe("checkout shipping country (quote ≡ confirm)", () => {
  it("normalizes ISO codes and rejects empty / invents nothing", () => {
    expect(normalizeCheckoutShippingCountry("se")).toBe("SE");
    expect(normalizeCheckoutShippingCountry(" US ")).toBe("US");
    expect(normalizeCheckoutShippingCountry("")).toBeNull();
    expect(normalizeCheckoutShippingCountry(null)).toBeNull();
    expect(normalizeCheckoutShippingCountry("Sweden")).toBeNull();
  });

  it("prefers delivery country when present, else active zone — never hardcodes SE", () => {
    expect(
      resolveCheckoutShippingCountry({
        deliveryCountry: "US",
        activeZoneCountry: "US",
      }),
    ).toBe("US");
    expect(
      resolveCheckoutShippingCountry({
        deliveryCountry: null,
        activeZoneCountry: "US",
      }),
    ).toBe("US");
    expect(
      resolveCheckoutShippingCountry({
        deliveryCountry: "SE",
        activeZoneCountry: "SE",
      }),
    ).toBe("SE");
    expect(
      resolveCheckoutShippingCountry({
        deliveryCountry: null,
        activeZoneCountry: null,
      }),
    ).toBeNull();
  });

  it("quote and confirm resolve the same charge for the same country", () => {
    const forCountry = (countryCode: string) => {
      const quote = resolveCustomerShippingQuote({
        bottleCount: 6,
        countryCode,
        rates: PACT_SE_99,
        allowLegacyFallback: false,
      });
      return checkoutCustomerShippingCharge({
        source: quote.source,
        shippingSek: quote.grossCents / 100,
      });
    };

    expect(forCountry("SE")).toEqual({
      shippingSek: 99,
      shippingPending: false,
    });
    // US has no rate row → explanatory pending path, not Sweden's 99.
    expect(forCountry("US")).toEqual({
      shippingSek: 0,
      shippingPending: true,
    });
  });
});

describe("checkout shipping label currency", () => {
  const usdCtx = {
    currencyCode: "USD",
    locale: "en" as const,
    sekToDisplayRate: fallbackSekToDisplayRate("USD"),
  };
  const sekCtx = {
    currencyCode: "SEK",
    locale: "sv" as const,
    sekToDisplayRate: 1,
  };

  it("formats Sweden's 99 SEK as 99 kr, not $99.0", () => {
    expect(
      formatSekAsDisplayMoney(99, sekCtx).replace(/\u00a0/g, " "),
    ).toBe("99 kr");

    // Anti-pattern that produced the bug: treating SEK as already-display USD.
    expect(
      formatDisplayMoney(99, {
        currencyCode: "USD",
        locale: "en",
        sekToDisplayRate: 1,
      }).replace(/\u00a0/g, " "),
    ).toBe("$99.0");

    // Correct path converts SEK → USD (≈ 99/10.5).
    const converted = formatSekAsDisplayMoney(99, usdCtx).replace(/\u00a0/g, " ");
    expect(converted).not.toBe("$99.0");
    expect(converted.startsWith("$")).toBe(true);
  });

  it("shows explanatory pending copy when no rate row exists", () => {
    const state = resolveCheckoutShippingLabelState({
      hasPallet: true,
      shippingPending: true,
      shippingSek: 0,
    });
    expect(state).toEqual({ kind: "pending" });
    expect(
      formatCheckoutShippingLabel(state, {
        pendingLabel: "Shipping confirmed before you are charged",
        freeLabel: "Free",
        formatSek: (n) => formatSekAsDisplayMoney(n, usdCtx),
      }),
    ).toBe("Shipping confirmed before you are charged");
  });

  it("formats a configured amount with the SEK→display formatter", () => {
    const state = resolveCheckoutShippingLabelState({
      hasPallet: true,
      shippingPending: false,
      shippingSek: 99,
    });
    expect(state).toEqual({ kind: "amount", shippingSek: 99 });
    const label = formatCheckoutShippingLabel(state, {
      pendingLabel: "pending",
      freeLabel: "Free",
      formatSek: (n) => formatSekAsDisplayMoney(n, sekCtx),
    });
    expect(label?.replace(/\u00a0/g, " ")).toBe("99 kr");
  });

  it("shows free when configured shipping is zero", () => {
    expect(
      formatCheckoutShippingLabel(
        resolveCheckoutShippingLabelState({
          hasPallet: true,
          shippingPending: false,
          shippingSek: 0,
        }),
        {
          pendingLabel: "pending",
          freeLabel: "Gratis",
          formatSek: (n) => String(n),
        },
      ),
    ).toBe("Gratis");
  });

  it("returns null before a pallet is selected", () => {
    expect(
      resolveCheckoutShippingLabelState({
        hasPallet: false,
        shippingPending: false,
        shippingSek: 99,
      }),
    ).toEqual({ kind: "none" });
  });
});
