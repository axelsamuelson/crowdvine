import { describe, expect, it } from "vitest";
import {
  confirmationDisplayTotalSek,
  confirmationOrderTypeFromFulfillment,
} from "@/lib/reservations/confirmation-display-total";
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
