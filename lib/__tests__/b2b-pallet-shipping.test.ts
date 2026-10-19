import { describe, expect, it } from "vitest";
import {
  aggregateB2BPalletStock,
  buildTotalBottlesByShipment,
} from "@/lib/b2b-pallet-stock";
import {
  calculateRoundedB2BPriceExclVat,
} from "@/lib/price-breakdown";

describe("B2B pallet shipping per bottle", () => {
  const shipmentId = "pallet-1";
  const upTempoId = "wine-up-tempo";
  const otherWineId = "wine-other";

  const palletCostCents = 400_00; // 400 SEK
  const upTempoQty = 30;
  const otherQty = 570; // full pallet 600 bottles

  it("under-counts bottles when items are wine-filtered (PDP bug)", () => {
    const onlyUpTempo = [
      {
        wine_id: upTempoId,
        quantity: upTempoQty,
        quantity_sold: 0,
        shipment_id: shipmentId,
        b2b_pallet_shipments: { cost_cents: palletCostCents, is_active: true },
      },
    ];

    const buggy = aggregateB2BPalletStock(onlyUpTempo, { sellableOnly: true });
    // 400 / 30 ≈ 13.33 — inflated vs full pallet
    expect(buggy.shippingMap.get(upTempoId)).toBeCloseTo(400 / 30, 5);
  });

  it("uses full-pallet totals when totalBottlesByShipment is provided", () => {
    const onlyUpTempo = [
      {
        wine_id: upTempoId,
        quantity: upTempoQty,
        quantity_sold: 0,
        shipment_id: shipmentId,
        b2b_pallet_shipments: { cost_cents: palletCostCents, is_active: true },
      },
    ];
    const allPalletRows = [
      { shipment_id: shipmentId, quantity: upTempoQty },
      { shipment_id: shipmentId, quantity: otherQty },
    ];
    const fullTotals = buildTotalBottlesByShipment(allPalletRows);
    expect(fullTotals.get(shipmentId)).toBe(600);

    const fixed = aggregateB2BPalletStock(onlyUpTempo, {
      sellableOnly: true,
      totalBottlesByShipment: fullTotals,
    });
    expect(fixed.shippingMap.get(upTempoId)).toBeCloseTo(400 / 600, 5);
  });

  it("keeps Up Tempo B2B price near admin when shipping uses full pallet", () => {
    const shipping = 400 / 600; // ~0.67 SEK
    const price = calculateRoundedB2BPriceExclVat(8, 11.13, 2219, 20, shipping);
    // Without shipping ≈ 139; with ~0.67 ≈ 140. Not 306 from 133 SEK shipping.
    expect(price).toBeGreaterThanOrEqual(139);
    expect(price).toBeLessThanOrEqual(141);

    const inflatedShipping = 400 / 30;
    const inflated = calculateRoundedB2BPriceExclVat(
      8,
      11.13,
      2219,
      20,
      inflatedShipping,
    );
    expect(inflated).toBeGreaterThan(150);
  });
});
