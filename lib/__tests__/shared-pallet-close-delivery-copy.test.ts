import { describe, expect, it } from "vitest";
import {
  DIRECT_BOX_DELIVERY_COPY_EN,
  DIRECT_BOX_DELIVERY_COPY_SV,
  SHARED_PALLET_CLOSE_DELIVERY_COPY_EN,
  SHARED_PALLET_CLOSE_DELIVERY_COPY_SV,
  formatSharedPalletCloseDeliveryCopy,
} from "@/lib/checkout/shared-pallet-close-delivery-copy";
import {
  directBoxDeliveryTerms,
  sharedPalletDeliveryTerms,
} from "@/lib/checkout/offer-quote";
import { dualOfferMsg } from "@/lib/checkout/dual-offer-customer-copy";

describe("shared pallet close/delivery copy (CEO — no Budbee)", () => {
  it("keeps one SV and one EN constant as the single source", () => {
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_SV).toBe(
      "Pallen stänger när den är full, senast {datum}. Leverans sker normalt inom 1–2 veckor efter att pallen stängt, och du får exakt leveransdag när pallen stängt.",
    );
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_EN).toBe(
      "The pallet closes when full, by {datum} at the latest. Delivery normally takes 1–2 weeks after the pallet closes, and you'll get the exact delivery day when it closes.",
    );
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_SV).not.toMatch(/Budbee/i);
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_EN).not.toMatch(/Budbee/i);
  });

  it("formats with datum and omits date clause when missing", () => {
    expect(formatSharedPalletCloseDeliveryCopy("sv", "7 dec")).toContain(
      "senast 7 dec",
    );
    expect(formatSharedPalletCloseDeliveryCopy("en", "7 Dec")).toContain(
      "by 7 Dec at the latest",
    );
    expect(formatSharedPalletCloseDeliveryCopy("sv", null)).not.toMatch(
      /senast/,
    );
    expect(formatSharedPalletCloseDeliveryCopy("en", null)).not.toMatch(
      /at the latest/,
    );
  });

  it("direct delivery copy has no carrier brand and no ETA", () => {
    expect(DIRECT_BOX_DELIVERY_COPY_SV).toBe("Hemleverans");
    expect(DIRECT_BOX_DELIVERY_COPY_EN).toBe("Home delivery");
    expect(directBoxDeliveryTerms().previewLabelSv).toBe("Hemleverans");
    expect(directBoxDeliveryTerms().previewLabelEn).toBe("Home delivery");
    expect(directBoxDeliveryTerms().previewLabelSv).not.toMatch(
      /Budbee|veckor|days/i,
    );
  });

  it("offer-quote shared preview labels stay Budbee-free", () => {
    const terms = sharedPalletDeliveryTerms();
    expect(terms.previewLabelSv).not.toMatch(/Budbee/i);
    expect(terms.previewLabelEn).not.toMatch(/Budbee/i);
  });

  it("direct legal line has no Budbee and no delivery window", () => {
    expect(dualOfferMsg("sv", "dualOfferLegalLineDirect", { total: "100 kr" }))
      .toBe("Ditt kort debiteras 100 kr nu. Hemleverans.");
    expect(dualOfferMsg("en", "dualOfferLegalLineDirect", { total: "100 SEK" }))
      .toBe("Your card is charged 100 SEK now. Home delivery.");
    expect(
      dualOfferMsg("sv", "dualOfferLegalLineDirect", { total: "1" }),
    ).not.toMatch(/Budbee|arbetsdagar|5–10/i);
  });
});
