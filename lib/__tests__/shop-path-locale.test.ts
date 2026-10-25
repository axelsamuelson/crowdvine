import { describe, expect, it } from "vitest";

import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";

describe("localeFromShopPath", () => {
  it("maps shop, product, producer and guide paths", () => {
    expect(localeFromShopPath("/vin")).toBe("sv");
    expect(localeFromShopPath("/wine/orange-natural-wine")).toBe("en");
    expect(localeFromShopPath("/produkt/x")).toBe("sv");
    expect(localeFromShopPath("/product/x")).toBe("en");
    expect(localeFromShopPath("/producenter/foo")).toBe("sv");
    expect(localeFromShopPath("/producers/foo")).toBe("en");
    expect(localeFromShopPath("/guider")).toBe("sv");
    expect(localeFromShopPath("/guides/x")).toBe("en");
  });

  it("maps about and legal language pairs", () => {
    expect(localeFromShopPath("/om-oss")).toBe("sv");
    expect(localeFromShopPath("/about")).toBe("en");
    expect(localeFromShopPath("/villkor")).toBe("sv");
    expect(localeFromShopPath("/terms")).toBe("en");
    expect(localeFromShopPath("/integritetspolicy")).toBe("sv");
    expect(localeFromShopPath("/privacy")).toBe("en");
    expect(localeFromShopPath("/cookies")).toBe("sv");
    expect(localeFromShopPath("/cookie-policy")).toBe("en");
  });

  it("returns null for shared/unpaired paths", () => {
    expect(localeFromShopPath("/")).toBeNull();
    expect(localeFromShopPath("/checkout")).toBeNull();
    expect(localeFromShopPath("/taste-quiz")).toBeNull();
  });
});
