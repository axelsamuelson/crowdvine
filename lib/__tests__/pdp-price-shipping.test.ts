import { describe, expect, it } from "vitest";

import { resolveB2cUnitPriceSek } from "@/lib/pdp/b2c-unit-price";
import { formatPalletDeliveryWhen } from "@/lib/pdp/pallet-delivery-when";
import { pdpShippingFeesFromRates } from "@/lib/pdp/shipping-fees";
import type { CustomerShippingRateRow } from "@/lib/customer-shipping-pricing";

function rate(
  partial: Partial<CustomerShippingRateRow> &
    Pick<CustomerShippingRateRow, "channel" | "flatFeeCents">,
): CustomerShippingRateRow {
  return {
    id: partial.channel,
    countryCode: "SE",
    freeShipping: false,
    freeShippingThresholdCents: null,
    minBottles: null,
    maxBottles: null,
    active: true,
    validFrom: null,
    validTo: null,
    ...partial,
  };
}

describe("resolveB2cUnitPriceSek", () => {
  it("uses the list price until a member discount applies", () => {
    expect(
      resolveB2cUnitPriceSek({
        listPriceSek: 216,
        catalogAmount: 216,
        breakdown: {
          total: 216,
          listTotalInclVat: 216,
          memberDiscountAmount: 0,
        },
      }),
    ).toBe(216);
  });

  it("uses the discounted unit when a member discount is present", () => {
    expect(
      resolveB2cUnitPriceSek({
        listPriceSek: 216,
        catalogAmount: 216,
        breakdown: {
          total: 194,
          listTotalInclVat: 216,
          memberDiscountAmount: 22,
        },
      }),
    ).toBe(194);
  });
});

describe("pdpShippingFeesFromRates", () => {
  it("reads the pact per-order fee and the direct-box fee for one box of 6", () => {
    const fees = pdpShippingFeesFromRates([
      rate({ channel: "pact", flatFeeCents: 9900 }),
      rate({ channel: "direct_box", flatFeeCents: 14900, minBottles: 6 }),
    ]);
    expect(fees.pactPerOrderSek).toBe(99);
    expect(fees.directBoxPerBoxSek).toBe(149);
  });

  it("returns nulls when the rate rows are missing", () => {
    expect(pdpShippingFeesFromRates([])).toEqual({
      pactPerOrderSek: null,
      directBoxPerBoxSek: null,
    });
  });

  it("does not reuse the pact fee for direct_box", () => {
    const fees = pdpShippingFeesFromRates([
      rate({ channel: "pact", flatFeeCents: 9900 }),
    ]);
    expect(fees.pactPerOrderSek).toBe(99);
    expect(fees.directBoxPerBoxSek).toBeNull();
  });
});

describe("formatPalletDeliveryWhen", () => {
  it("returns null when no date is set", () => {
    expect(
      formatPalletDeliveryWhen(
        { expected: null, start: null, end: null },
        "sv",
      ),
    ).toBeNull();
  });

  it("formats a single expected date in Swedish", () => {
    expect(
      formatPalletDeliveryWhen(
        { expected: "2026-12-04", start: null, end: null },
        "sv",
      ),
    ).toBe("4 december 2026");
  });

  it("formats a window when both ends are set", () => {
    expect(
      formatPalletDeliveryWhen(
        { expected: null, start: "2026-12-01", end: "2026-12-08" },
        "en",
      ),
    ).toBe("1 December–8 December 2026");
  });
});
