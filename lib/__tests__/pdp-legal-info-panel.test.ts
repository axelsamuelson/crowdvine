import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { termsPath } from "@/lib/commerce/terms-section-href";
import { translate } from "@/lib/i18n/messages";

describe("PDP legal info panel copy", () => {
  it("reuses locked SV commerce strings character-for-character", () => {
    expect(translate("sv", "commerce.sharedPalletDelivery")).toBe(
      "Delad pall: Efter stängningen levererar vi inom 30 dagar, normalt inom 2–3 veckor.",
    );
    expect(translate("sv", "commerce.withdrawalLine")).toBe(
      "14 dagars ångerrätt",
    );
    expect(translate("sv", "commerce.sellerLine")).toBe(
      "Säljare: EURPACT OÜ, Tallinn, Estland",
    );
    expect(translate("sv", "commerce.ageMinimumLine")).toBe(
      "Du måste ha fyllt 20 år för att köpa.",
    );
    expect(translate("sv", "commerce.termsLinkArrow")).toBe("Köpvillkor →");
    expect(translate("sv", "commerce.deliveryGuideLinkArrow")).toBe(
      "Så fungerar leveransen →",
    );
  });

  it("exposes approved EN commerce strings including age line", () => {
    expect(translate("en", "commerce.sharedPalletDelivery")).toBe(
      "Shared pallet: We deliver within 30 days after the pallet closes, normally within 2–3 weeks.",
    );
    expect(translate("en", "commerce.withdrawalLine")).toBe(
      "14-day right of withdrawal",
    );
    expect(translate("en", "commerce.sellerLine")).toBe(
      "Seller: EURPACT OÜ, Tallinn, Estonia",
    );
    expect(translate("en", "commerce.ageMinimumLine")).toBe(
      "You must be 20 or older to buy.",
    );
    expect(translate("en", "commerce.termsLinkArrow")).toBe("Terms →");
    expect(translate("en", "commerce.deliveryGuideLinkArrow")).toBe(
      "How delivery works →",
    );
  });

  it("links terms to /villkor (SV) and /terms (EN)", () => {
    expect(termsPath("sv")).toBe("/villkor");
    expect(termsPath("en")).toBe("/terms");
  });

  it("component uses 16px lucide icons, recessed surface, no underlines on rows", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/commerce/pdp-legal-info-panel.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Truck/);
    expect(src).toMatch(/Undo2/);
    expect(src).toMatch(/Building2/);
    expect(src).toMatch(/IdCard/);
    expect(src).toMatch(/#ebe8e3/);
    expect(src).toMatch(/#4f4f4f/);
    expect(src).toMatch(/size-4/);
    expect(src).toMatch(/gap-2/);
    expect(src).toMatch(/no-underline/);
    expect(src).not.toMatch(/underline-offset/);
    expect(src).toMatch(/commerce\.ageMinimumLine/);
    expect(src).toMatch(/commerce\.termsLinkArrow/);
    expect(src).toMatch(/commerce\.deliveryGuideLinkArrow/);
    expect(src).toMatch(/homeDeliveryGuidePath/);
    expect(src).toMatch(/whitespace-nowrap/);
    expect(src).toMatch(/2–3 veckor/);
    expect(src).toMatch(/min-h-11/);
    expect(src).toMatch(/flex flex-wrap items-center gap-x-3 gap-y-2/);
    expect(src).toMatch(/pl-6/);
    // No orphanable middle-dot separator between links.
    expect(src).not.toMatch(/>\s*·\s*</);
  });


  it("PalletStatusBar no longer shows the home-delivery guide link (moved into panel)", () => {
    const bar = readFileSync(
      resolve(process.cwd(), "components/pdp/pallet-status-bar.tsx"),
      "utf8",
    );
    expect(bar).not.toMatch(/homeDeliveryGuideLink/);
    expect(bar).not.toMatch(/homeDeliveryGuidePath/);
    expect(bar).toMatch(/DirectBoxDeliveryPromise/);
    expect(bar).toMatch(/trackPalletStatusViewed/);
    expect(bar).toMatch(/unavailableMessage/);
  });


  it("is wired under the ×6 hint in the PDP buy card", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "components/product/product-pdp-layout.tsx"),
      "utf8",
    );
    const hintIdx = layout.indexOf("MinSixBottlesHint");
    const panelIdx = layout.indexOf("PdpLegalInfoPanel");
    expect(hintIdx).toBeGreaterThan(-1);
    expect(panelIdx).toBeGreaterThan(hintIdx);
  });
});
