import { describe, expect, it } from "vitest";
import {
  CHECKOUT_PALLET_CLOSE_LINE_EN,
  CHECKOUT_PALLET_CLOSE_LINE_SV,
  CHECKOUT_PALLET_DELIVERY_LINE_EN,
  CHECKOUT_PALLET_DELIVERY_LINE_SV,
  DIRECT_BOX_DELIVERY_COPY_EN,
  DIRECT_BOX_DELIVERY_COPY_SV,
  SHARED_PALLET_CLOSE_DELIVERY_COPY_EN,
  SHARED_PALLET_CLOSE_DELIVERY_COPY_SV,
  formatCheckoutPalletDeliveryLines,
  formatSharedPalletCloseDeliveryCopy,
} from "@/lib/checkout/shared-pallet-close-delivery-copy";
import {
  directBoxDeliveryTerms,
  sharedPalletDeliveryTerms,
} from "@/lib/checkout/offer-quote";
import { dualOfferMsg } from "@/lib/checkout/dual-offer-customer-copy";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";

describe("shared pallet close/delivery copy (owner — no Budbee)", () => {
  it("keeps one SV and one EN constant as the single source", () => {
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_SV).toBe(
      "Pallen stänger när den är full, senast {datum}. Leverans sker normalt inom 2–3 veckor efter att pallen stängt och alltid senast 30 dagar efter. När pallen har skickats får du ett beräknat leveransfönster, och leveransdagen när vinet nått Sverige.",
    );
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_EN).toBe(
      "The pallet closes when full, by {datum} at the latest. Delivery normally takes 2–3 weeks after the pallet closes and always within 30 days. Once the pallet has shipped you'll get an estimated delivery window, and the delivery day once the wine has reached Sweden.",
    );
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_SV).not.toMatch(/Budbee/i);
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_EN).not.toMatch(/Budbee/i);
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_SV).toMatch(/2–3 veckor/);
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_EN).toMatch(/2–3 weeks/);
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_SV).toMatch(/30 dagar/);
    expect(SHARED_PALLET_CLOSE_DELIVERY_COPY_EN).toMatch(/30 days/);
  });

  it("formats with datum and omits date clause when missing", () => {
    expect(formatSharedPalletCloseDeliveryCopy("sv", "7 dec")).toContain(
      "senast 7 dec",
    );
    expect(formatSharedPalletCloseDeliveryCopy("en", "7 Dec")).toContain(
      "by 7 Dec at the latest",
    );
    // Close-date clause omitted; post-close "senast 30 dagar" / "within 30 days" stay.
    expect(formatSharedPalletCloseDeliveryCopy("sv", null)).toBe(
      "Pallen stänger när den är full. Leverans sker normalt inom 2–3 veckor efter att pallen stängt och alltid senast 30 dagar efter. När pallen har skickats får du ett beräknat leveransfönster, och leveransdagen när vinet nått Sverige.",
    );
    expect(formatSharedPalletCloseDeliveryCopy("en", null)).toBe(
      "The pallet closes when full. Delivery normally takes 2–3 weeks after the pallet closes and always within 30 days. Once the pallet has shipped you'll get an estimated delivery window, and the delivery day once the wine has reached Sweden.",
    );
    expect(formatSharedPalletCloseDeliveryCopy("sv", null)).toMatch(
      /2–3 veckor/,
    );
    expect(formatSharedPalletCloseDeliveryCopy("en", null)).toMatch(
      /2–3 weeks/,
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

  it("checkout uses two short lines without debit or delivery-day sentence", () => {
    const sv = formatCheckoutPalletDeliveryLines("sv", "7 dec");
    expect(sv.closeLine).toBe(
      "Pallen stänger när den är full, senast 7 dec.",
    );
    expect(sv.deliveryLine).toBe(CHECKOUT_PALLET_DELIVERY_LINE_SV);
    expect(sv.closeLine + sv.deliveryLine).not.toMatch(/debiter|kort/i);
    expect(sv.deliveryLine).not.toMatch(/leveransfönster|leveransdagen/i);

    const en = formatCheckoutPalletDeliveryLines("en", "7 Dec");
    expect(en.closeLine).toBe(
      "The pallet closes when full, by 7 Dec at the latest.",
    );
    expect(en.deliveryLine).toBe(CHECKOUT_PALLET_DELIVERY_LINE_EN);
    expect(en.closeLine + en.deliveryLine).not.toMatch(/charge|card/i);
    expect(en.deliveryLine).not.toMatch(/delivery window|delivery day/i);

    expect(CHECKOUT_PALLET_CLOSE_LINE_SV).toContain("{datum}");
    expect(CHECKOUT_PALLET_CLOSE_LINE_EN).toContain("{datum}");
  });

  it("formats close date as full long month (SV/EN)", () => {
    const iso = "2026-12-05T12:00:00.000Z";
    const sv = formatSharedPalletChargeDeadline(iso, "sv");
    const en = formatSharedPalletChargeDeadline(iso, "en");
    expect(sv).toMatch(/5\s+december\s+2026/i);
    expect(en).toMatch(/5\s+December\s+2026/i);
    const notice = formatCheckoutPalletDeliveryLines("sv", sv);
    expect(notice.closeLine).toBe(
      `Pallen stänger när den är full, senast ${sv}.`,
    );
    expect(notice.deliveryLine).toBe(
      "Leverans normalt 2–3 veckor därefter, alltid inom 30 dagar.",
    );
  });
});
