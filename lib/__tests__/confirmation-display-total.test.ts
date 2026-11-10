import { describe, expect, it } from "vitest";
import {
  confirmationChargedLineTotalsSek,
  confirmationDisplayTotalSek,
  confirmationOrderTypeFromFulfillment,
  confirmationStatusMessageKey,
  isCustomerFacingLabel,
  shortReservationReference,
} from "@/lib/reservations/confirmation-display-total";
import { b2cWholeKronorFromOre } from "@/lib/cart/b2c-line-pricing";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("confirmationDisplayTotalSek", () => {
  it("rounds wine + shipping to whole kronor for approved belopp copy", () => {
    expect(
      confirmationDisplayTotalSek({
        totalSek: 194,
        shippingRevenueGrossCents: 9900,
      }),
    ).toBe(293);
  });

  it("falls back to wine subtotal cents when total_sek missing", () => {
    expect(
      confirmationDisplayTotalSek({
        totalSek: null,
        shippingRevenueGrossCents: 9900,
        wineSubtotalCentsFallback: 19400,
      }),
    ).toBe(293);
  });

  it("treats missing shipping as zero", () => {
    expect(
      confirmationDisplayTotalSek({
        totalSek: 194,
        shippingRevenueGrossCents: null,
      }),
    ).toBe(194);
  });
});

describe("confirmationOrderTypeFromFulfillment", () => {
  it("maps warehouse / direct_box to warehouse without requiring order_type column", () => {
    expect(confirmationOrderTypeFromFulfillment("warehouse")).toBe("warehouse");
    expect(confirmationOrderTypeFromFulfillment("direct_box")).toBe("warehouse");
    expect(confirmationOrderTypeFromFulfillment("shared_pallet")).toBe(
      "producer",
    );
    expect(confirmationOrderTypeFromFulfillment(null)).toBe("producer");
  });
});

describe("confirmationChargedLineTotalsSek", () => {
  it("allocates charged wine so lines + shipping equal display total (review case)", () => {
    // Catalog: 21100 öre → 211 kr × 6 = 1266 list; charged wine 1014 + ship 99 = 1113.
    const listUnitOre = 21100;
    expect(b2cWholeKronorFromOre(listUnitOre)).toBe(211);
    const winesTotalSek = 1014;
    const shippingSek = 99;
    const lines = confirmationChargedLineTotalsSek({
      lines: [{ quantity: 6, listUnitOre }],
      winesTotalSek,
    });
    expect(lines).toEqual([1014]);
    expect(
      confirmationDisplayTotalSek({
        totalSek: winesTotalSek,
        shippingRevenueGrossCents: shippingSek * 100,
      }),
    ).toBe(1113);
    expect(lines.reduce((s, n) => s + n, 0) + shippingSek).toBe(1113);
  });

  it("pro-rates multi-line carts to whole kronor without drift", () => {
    const winesTotalSek = 1000;
    const lines = confirmationChargedLineTotalsSek({
      lines: [
        { quantity: 2, listUnitOre: 21100 },
        { quantity: 4, listUnitOre: 15000 },
      ],
      winesTotalSek,
    });
    expect(lines.reduce((s, n) => s + n, 0)).toBe(1000);
    expect(lines.every((n) => Number.isInteger(n))).toBe(true);
  });
});

describe("confirmation customer-facing helpers", () => {
  it("maps pending_producer_approval to waiting-pallet copy key", () => {
    expect(confirmationStatusMessageKey("pending_producer_approval")).toBe(
      "checkout.successStatusWaitingPallet",
    );
    expect(confirmationStatusMessageKey("PENDING_PRODUCER_APPROVAL")).toBe(
      "checkout.successStatusWaitingPallet",
    );
    expect(confirmationStatusMessageKey("weird_internal")).toBeNull();
  });

  it("rejects Unknown… stubs and shortens reservation ids", () => {
    expect(isCustomerFacingLabel("Unknown Pickup Zone")).toBe(false);
    expect(isCustomerFacingLabel("Synthetic Stockholm Delivery")).toBe(true);
    expect(
      shortReservationReference("3b6be085-ed8b-4e76-9018-69916ff327d9"),
    ).toBe("3B6BE085");
  });
});

describe("confirmation success surface contracts", () => {
  it("reservation GET avoids selecting missing order_type and includes shipping + deadline fields", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/user/reservations/[id]/route.ts"),
      "utf8",
    );
    // Select list must not request order_type (absent on some preview/test DBs).
    expect(src).toMatch(/shipping_revenue_gross_cents/);
    expect(src).toMatch(/fulfillment_channel/);
    expect(src).toMatch(/confirmationDisplayTotalSek/);
    expect(src).toMatch(/confirmationChargedLineTotalsSek/);
    expect(src).not.toMatch(/Unknown Pickup Zone/);
    expect(src).not.toMatch(
      /select\(\s*`[\s\S]*?\border_type\b[\s\S]*?`\s*\)/,
    );
  });

  it("success page shows approved belopp/datum/email + unchecked marketing consent", () => {
    const successSrc = readFileSync(
      resolve(process.cwd(), "app/checkout/success/page.tsx"),
      "utf8",
    );
    const consentSrc = readFileSync(
      resolve(process.cwd(), "components/checkout/marketing-consent-checkbox.tsx"),
      "utf8",
    );
    expect(successSrc).toMatch(/successPurchaseComplete/);
    expect(successSrc).toMatch(/Math\.round/);
    expect(successSrc).toMatch(/chargeDeadlineLabel/);
    expect(successSrc).toMatch(/customer_email/);
    expect(successSrc).toMatch(/MarketingConsentCheckbox/);
    expect(successSrc).toMatch(/successStatusWaitingPallet|confirmationStatusMessageKey/);
    expect(successSrc).toMatch(/shortReservationReference/);
    expect(successSrc).not.toMatch(/successProducerOrder/);
    expect(successSrc).not.toMatch(/successProducer\}/);
    expect(consentSrc).toMatch(/useState\(false\)/);
    expect(consentSrc).toMatch(/\/api\/marketing\/consent/);
    expect(consentSrc).toMatch(/NEW_PALLET_OPEN_CONSENT_TEXT_VERSION/);
  });

  it("formats long Swedish close date for confirmation copy", () => {
    const label = formatSharedPalletChargeDeadline(
      "2026-12-05T12:00:00.000Z",
      "sv",
    );
    expect(label).toBe("5 december 2026");
  });
});
