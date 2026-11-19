import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { localeFromLangQuery } from "@/lib/i18n/locale";
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
    expect(localeFromShopPath("/region/loire")).toBe("sv");
    expect(localeFromShopPath("/regions/loire")).toBe("en");
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

  it("maps homepage language pair", () => {
    expect(localeFromShopPath("/")).toBe("sv");
    expect(localeFromShopPath("/en")).toBe("en");
  });

  it("maps /en/checkout and /en/profile to English (middleware rewrite targets)", () => {
    expect(localeFromShopPath("/en/checkout")).toBe("en");
    expect(localeFromShopPath("/en/checkout/success")).toBe("en");
    expect(localeFromShopPath("/en/profile")).toBe("en");
    expect(localeFromShopPath("/en/profile/reservations")).toBe("en");
  });

  it("returns null for shared/unpaired paths", () => {
    expect(localeFromShopPath("/checkout")).toBeNull();
    expect(localeFromShopPath("/profile")).toBeNull();
    expect(localeFromShopPath("/taste-quiz")).toBeNull();
    expect(localeFromShopPath("/reservation-extension/confirm")).toBeNull();
  });
});

describe("localeFromLangQuery", () => {
  it("parses explicit ?lang= from email/landing links", () => {
    expect(localeFromLangQuery("?lang=sv")).toBe("sv");
    expect(localeFromLangQuery("lang=en")).toBe("en");
    expect(localeFromLangQuery(new URLSearchParams("lang=sv"))).toBe("sv");
    expect(localeFromLangQuery("?lang=nope")).toBeNull();
    expect(localeFromLangQuery("")).toBeNull();
    expect(localeFromLangQuery(null)).toBeNull();
  });
});

describe("en checkout/profile middleware rewrite", () => {
  it("rewrites /en/checkout and /en/profile to the shared App Router trees", () => {
    const src = readFileSync(
      resolve(process.cwd(), "middleware.ts"),
      "utf8",
    );
    expect(src).toMatch(/\/en\/checkout/);
    expect(src).toMatch(/\/en\/profile/);
    expect(src).toMatch(/NextResponse\.rewrite/);
    expect(src).toMatch(/x-pact-locale\",\s*\"en\"/);
  });
});

