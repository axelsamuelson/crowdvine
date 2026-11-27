import { describe, expect, it } from "vitest";

import { buildOptimisticCaseCart } from "@/lib/cart/optimistic-case-cart";
import {
  evaluateShipToCheckout,
  shipToCheckoutResponse,
} from "@/lib/checkout/ship-to-gate";
import { productPageUrls } from "@/lib/i18n/localized-routes";
import { alternateLanguagePath } from "@/lib/i18n/localized-paths";
import { guideHreflang } from "@/lib/guides/guide-routes";
import { countryPolicy } from "@/lib/market/country-registry";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { resolveDisplayCurrencyCode } from "@/lib/shopping-context/currency-policy";
import { evaluateWaitlistSignup } from "@/lib/waitlist/signup";
import type { Cart, Product, ProductVariant } from "@/lib/shopify/types";

function checkoutRequest(cookie?: string, header?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (header) headers.set("x-vercel-ip-country", header);
  return new Request("http://localhost/api/checkout/payment-intent", {
    method: "POST",
    headers,
  });
}

describe("ship-to checkout gate", () => {
  it("returns 409 for an unknown country, Norway and the US", async () => {
    for (const cookie of ["pact_ship_to=XX", "pact_ship_to=NO", "pact_ship_to=US"]) {
      const blocked = shipToCheckoutResponse(checkoutRequest(cookie));
      expect(blocked?.status).toBe(409);
      const body = (await blocked!.json()) as { code: string };
      expect(body.code).toBe("ship_to_not_live");
    }
    expect(
      evaluateShipToCheckout({ shipTo: null, addressCountry: "US" })?.code,
    ).toBe("ship_to_not_live");
  });

  it("leaves a Sweden request with no ship-to cookie on the existing path", () => {
    expect(shipToCheckoutResponse(checkoutRequest())).toBeNull();
    expect(
      evaluateShipToCheckout({ shipTo: "SE", addressCountry: "SE" }),
    ).toBeNull();
  });

  it("rejects a delivery address in a different country than Ship to", () => {
    expect(
      evaluateShipToCheckout({ shipTo: "SE", addressCountry: "US" })?.code,
    ).toBe("ship_to_address_mismatch");
  });

  it("treats a missing country as waitlist, age 18, EUR, and never Sweden", () => {
    const unknown = countryPolicy("ZZ");
    expect(unknown.status).toBe("waitlist");
    expect(unknown.ageMinimum).toBe(18);
    expect(unknown.displayCurrency).toBe("EUR");
    expect(unknown.countryCode).not.toBe("SE");
    const fallback = fallbackShoppingContext("sv");
    expect(fallback.activeZone.countryCode).toBe("XX");
    expect(fallback.activeZone.canCheckoutNormally).toBe(false);
    expect(fallback.currencyCode).toBe("SEK");
  });
});

describe("language and prices stay on the URL and SEK", () => {
  it("pairs product URLs and keeps server currency in SEK", () => {
    const urls = productPageUrls("l-2023");
    expect(urls.sv).toContain("/produkt/l-2023");
    expect(urls.en).toContain("/product/l-2023");
    expect(urls.xDefault).toBe(urls.en);
    const guide = guideHreflang("hub", "https://pactwines.com");
    expect(guide["sv-SE"]).toContain("/guider");
    expect(guide.en).toContain("/guides");
    expect(guide["x-default"]).toBe(guide.en);
    expect(alternateLanguagePath("/produkt/l-2023", "en")).toBe("/product/l-2023");
    expect(alternateLanguagePath("/product/l-2023", "sv")).toBe("/produkt/l-2023");
    expect(
      resolveDisplayCurrencyCode({
        countryCode: "US",
        currencyCode: "USD",
      } as never),
    ).toBe("SEK");
  });

  it("keeps one currency after an optimistic add onto a USD-labelled cart", () => {
    const product = {
      id: "wine-1",
      handle: "test",
      title: "Test",
      priceRange: {
        minVariantPrice: { amount: "150", currencyCode: "USD" },
        maxVariantPrice: { amount: "150", currencyCode: "USD" },
      },
    } as Product;
    const variant = {
      id: "wine-2-default",
      title: "750",
      availableForSale: true,
      selectedOptions: [],
      price: { amount: "150", currencyCode: "USD" },
    } as ProductVariant;
    const previous = {
      id: "cart",
      checkoutUrl: "/checkout",
      totalQuantity: 6,
      lines: [
        {
          id: "line-1",
          quantity: 6,
          source: "producer",
          cost: { totalAmount: { amount: "900", currencyCode: "USD" } },
          merchandise: { id: "wine-1", title: "Old", product },
        },
      ],
      cost: {
        subtotalAmount: { amount: "900", currencyCode: "USD" },
        totalAmount: { amount: "900", currencyCode: "USD" },
        totalTaxAmount: { amount: "0", currencyCode: "USD" },
      },
    } as Cart;
    const next = buildOptimisticCaseCart(previous, product, variant, 6);
    const codes = new Set([
      next.cost.totalAmount.currencyCode,
      next.cost.subtotalAmount.currencyCode,
      ...next.lines.map((line) => line.cost.totalAmount.currencyCode),
    ]);
    expect([...codes]).toEqual(["SEK"]);
  });
});

describe("waitlist age gate", () => {
  it("rejects a Norway signup under 18 and saves nothing", () => {
    const decision = evaluateWaitlistSignup({
      email: "ada@example.com",
      countryCode: "NO",
      dateOfBirth: "2010-01-01",
      now: new Date("2026-11-26T12:00:00Z"),
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe("under_age");
  });

  it("accepts a Norway signup at 18 without storing the birth date on the decision", () => {
    const decision = evaluateWaitlistSignup({
      email: "ada@example.com",
      countryCode: "NO",
      dateOfBirth: "2000-01-01",
      now: new Date("2026-11-26T12:00:00Z"),
    });
    expect(decision.ok).toBe(true);
    expect(decision).not.toHaveProperty("dateOfBirth");
  });
});
