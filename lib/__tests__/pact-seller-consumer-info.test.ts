import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  TERMS_SECTION_SELLER_ID,
  TERMS_SECTION_WITHDRAWAL_ID,
  termsPath,
  termsSectionHref,
} from "@/lib/commerce/terms-section-href";
import { translate } from "@/lib/i18n/messages";

describe("PACT seller/consumer disclosure copy", () => {
  it("exposes exact SV strings", () => {
    expect(translate("sv", "commerce.sellerLine")).toBe(
      "Säljare: EURPACT OÜ, Tallinn, Estland",
    );
    expect(translate("sv", "commerce.withdrawalLine")).toBe(
      "14 dagars ångerrätt",
    );
    expect(translate("sv", "commerce.sharedPalletDelivery")).toBe(
      "Delad pall: Efter stängningen levererar vi inom 30 dagar, normalt inom 2–3 veckor.",
    );
  });

  it("exposes exact EN strings", () => {
    expect(translate("en", "commerce.sellerLine")).toBe(
      "Seller: EURPACT OÜ, Tallinn, Estonia",
    );
    expect(translate("en", "commerce.withdrawalLine")).toBe(
      "14-day right of withdrawal",
    );
    expect(translate("en", "commerce.sharedPalletDelivery")).toBe(
      "Shared pallet: We deliver within 30 days after the pallet closes, normally within 2–3 weeks.",
    );
  });

  it("does not use forbidden wording", () => {
    for (const locale of ["sv", "en"] as const) {
      const blob = [
        translate(locale, "commerce.sellerLine"),
        translate(locale, "commerce.withdrawalLine"),
        translate(locale, "commerce.sharedPalletDelivery"),
      ].join("\n");
      expect(blob).not.toMatch(/UPS/i);
      expect(blob).not.toMatch(/grossist/i);
      expect(blob).not.toMatch(/reservation/i);
      expect(blob).not.toMatch(/reservera/i);
    }
  });
});

describe("terms section anchors + hrefs", () => {
  it("uses stable punkt-1 / punkt-9 anchors on SV and EN terms", () => {
    expect(TERMS_SECTION_SELLER_ID).toBe("punkt-1");
    expect(TERMS_SECTION_WITHDRAWAL_ID).toBe("punkt-9");
    expect(termsPath("sv")).toBe("/villkor");
    expect(termsPath("en")).toBe("/terms");
    expect(termsSectionHref("sv", TERMS_SECTION_SELLER_ID)).toBe(
      "/villkor#punkt-1",
    );
    expect(termsSectionHref("sv", TERMS_SECTION_WITHDRAWAL_ID)).toBe(
      "/villkor#punkt-9",
    );
    expect(termsSectionHref("en", TERMS_SECTION_SELLER_ID)).toBe(
      "/terms#punkt-1",
    );
    expect(termsSectionHref("en", TERMS_SECTION_WITHDRAWAL_ID)).toBe(
      "/terms#punkt-9",
    );
  });

  it("keeps LegalH2 ids on published terms pages", () => {
    const sv = readFileSync(
      resolve(process.cwd(), "content/legal/kopvillkor.tsx"),
      "utf8",
    );
    const en = readFileSync(
      resolve(process.cwd(), "content/legal/kopvillkor-en.tsx"),
      "utf8",
    );
    expect(sv).toMatch(/id="punkt-1"/);
    expect(sv).toMatch(/id="punkt-9"/);
    expect(en).toMatch(/id="punkt-1"/);
    expect(en).toMatch(/id="punkt-9"/);
  });
});

describe("PDP + /vin wiring (PACT only)", () => {
  it("component links seller and withdrawal to terms section hrefs", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "components/commerce/pact-seller-consumer-info.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(/TERMS_SECTION_SELLER_ID/);
    expect(src).toMatch(/TERMS_SECTION_WITHDRAWAL_ID/);
    expect(src).toMatch(/termsSectionHref/);
    expect(src).toMatch(/commerce\.sellerLine/);
    expect(src).toMatch(/commerce\.withdrawalLine/);
    expect(src).toMatch(/commerce\.sharedPalletDelivery/);
    expect(src).not.toMatch(/UPS/i);
    expect(src).not.toMatch(/grossist/i);
    expect(src).not.toMatch(/reservation/i);
  });

  it("PDP shows seller/withdrawal near buy and shared pallet next to direct-box", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "components/product/product-pdp-layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/PactSellerConsumerInfo/);
    expect(layout).toMatch(/showSharedPallet=\{false\}/);
    expect(layout).toMatch(/showSharedPalletPromise=/);
    expect(layout).toMatch(/!isDirtywine && product\.productType === "wine"/);

    const bar = readFileSync(
      resolve(process.cwd(), "components/pdp/pallet-status-bar.tsx"),
      "utf8",
    );
    expect(bar).toMatch(/showSharedPalletPromise/);
    expect(bar).toMatch(/DirectBoxDeliveryPromise/);
    expect(bar).toMatch(/PactSellerConsumerInfo/);
  });

  it("listing shows seller/withdrawal/pallet once on /vin (PACT)", () => {
    const shop = readFileSync(
      resolve(process.cwd(), "app/vin/components/main-shop-content.tsx"),
      "utf8",
    );
    expect(shop).toMatch(/PactSellerConsumerInfo/);
    expect(shop).toMatch(/!isB2BSite/);
    expect(shop).toMatch(/locale=\{locale\}/);
  });
});
