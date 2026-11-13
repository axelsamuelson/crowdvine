import { describe, expect, it } from "vitest";
import { buildAlcoholTaxReportingLines } from "@/lib/skatteverket/alcohol-tax-reporting-snapshot";
import { computeSwedishWineAlcoholTaxSek } from "@/lib/skatteverket/wine-alcohol-tax";

const snappedAt = "2026-11-13T12:00:00.000Z";

const buyer = {
  fullName: "Ada Lovelace",
  dateOfBirth: "1990-01-15",
  street: "Testgatan 1",
  postalCode: "11122",
  city: "Stockholm",
  country: "SE",
};

describe("buildAlcoholTaxReportingLines", () => {
  it("freezes buyer PII, volume, ABV and tax for a normal wine line", () => {
    const { lines, needsReviewCount } = buildAlcoholTaxReportingLines({
      reservationId: "res-1",
      buyer,
      items: [
        {
          orderReservationItemId: "item-1",
          wineId: "wine-1",
          wineName: "Premices",
          vintage: 2023,
          quantity: 6,
          volumeLiters: 0.75,
          abv: "13 %",
          alcoholPercentage: null,
        },
      ],
      snappedAt,
      triggerSource: "pallet_close",
    });

    expect(needsReviewCount).toBe(0);
    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    expect(line.buyerFullName).toBe("Ada Lovelace");
    expect(line.buyerDateOfBirth).toBe("1990-01-15");
    expect(line.deliveryStreet).toBe("Testgatan 1");
    expect(line.deliveryPostalCode).toBe("11122");
    expect(line.deliveryCity).toBe("Stockholm");
    expect(line.deliveryCountry).toBe("SE");
    expect(line.wineId).toBe("wine-1");
    expect(line.productName).toBe("Premices 2023");
    expect(line.quantity).toBe(6);
    expect(line.bottleVolumeLiters).toBe(0.75);
    expect(line.alcoholPercentage).toBe(13);
    expect(line.alcoholTaxSek).toBe(133.11);
    expect(line.needsReview).toBe(false);
    expect(line.productTaxCategory).toBeNull();
    expect(line.smallProducerReductionPct).toBeNull();
    expect(line.snappedAt).toBe(snappedAt);
    expect(line.triggerSource).toBe("pallet_close");
  });

  it("rounds tax once on total litres for every trigger path (never 133.14)", () => {
    for (const triggerSource of [
      "pallet_close",
      "direct_box_confirm",
      "legacy_auto_charge",
    ] as const) {
      const { lines } = buildAlcoholTaxReportingLines({
        reservationId: `res-${triggerSource}`,
        buyer,
        items: [
          {
            orderReservationItemId: `item-${triggerSource}`,
            wineId: "wine-round",
            wineName: "Round Me",
            vintage: null,
            quantity: 6,
            volumeLiters: 0.75,
            abv: null,
            alcoholPercentage: 13,
          },
        ],
        snappedAt,
        triggerSource,
      });
      expect(lines[0]!.alcoholTaxSek).toBe(133.11);
      expect(lines[0]!.alcoholTaxSek).not.toBe(133.14);
      // Same helper all paths use
      expect(
        computeSwedishWineAlcoholTaxSek({
          abvPercent: 13,
          volumeLiters: 6 * 0.75,
        }),
      ).toBe(133.11);
    }
  });

  it("stores NULL tax and needs_review when ABV is missing (never guesses)", () => {
    const { lines, needsReviewCount } = buildAlcoholTaxReportingLines({
      reservationId: "res-2",
      buyer,
      items: [
        {
          orderReservationItemId: "item-2",
          wineId: "wine-2",
          wineName: "Mystery",
          vintage: null,
          quantity: 2,
          volumeLiters: 0.75,
          abv: null,
          alcoholPercentage: null,
        },
      ],
      snappedAt,
      triggerSource: "direct_box_confirm",
    });

    expect(needsReviewCount).toBe(1);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.alcoholPercentage).toBeNull();
    expect(lines[0]!.alcoholTaxSek).toBeNull();
    expect(lines[0]!.needsReview).toBe(true);
    expect(lines[0]!.productName).toBe("Mystery");
  });

  it("flags fortified/mellanklass for review with null tax (never applies 37.34)", () => {
    const { lines, needsReviewCount } = buildAlcoholTaxReportingLines({
      reservationId: "res-fortified",
      buyer,
      items: [
        {
          orderReservationItemId: "item-fort",
          wineId: "wine-fort",
          wineName: "Port Style",
          vintage: null,
          quantity: 1,
          volumeLiters: 0.75,
          abv: null,
          alcoholPercentage: 14,
          classification: "fortified",
        },
      ],
      snappedAt,
      triggerSource: "pallet_close",
    });

    expect(needsReviewCount).toBe(1);
    expect(lines[0]!.needsReview).toBe(true);
    expect(lines[0]!.alcoholTaxSek).toBeNull();
    expect(lines[0]!.productTaxCategory).toBeNull();
  });

  it("defaults bottle volume to 0.75 L when wine volume is missing", () => {
    const { lines } = buildAlcoholTaxReportingLines({
      reservationId: "res-3",
      buyer,
      items: [
        {
          orderReservationItemId: "item-3",
          wineId: "wine-3",
          wineName: "No Volume",
          vintage: "2022",
          quantity: 1,
          volumeLiters: null,
          abv: null,
          alcoholPercentage: 12,
        },
      ],
      snappedAt,
      triggerSource: "legacy_auto_charge",
    });

    expect(lines[0]!.bottleVolumeLiters).toBe(0.75);
    expect(lines[0]!.alcoholTaxSek).toBe(22.19);
    expect(lines[0]!.needsReview).toBe(false);
  });

  it("skips zero-quantity lines", () => {
    const { lines } = buildAlcoholTaxReportingLines({
      reservationId: "res-4",
      buyer,
      items: [
        {
          orderReservationItemId: "item-0",
          wineId: "wine-0",
          wineName: "Empty",
          vintage: null,
          quantity: 0,
          volumeLiters: 0.75,
          abv: "12",
          alcoholPercentage: null,
        },
      ],
      snappedAt,
      triggerSource: "pallet_close",
    });
    expect(lines).toHaveLength(0);
  });
});
