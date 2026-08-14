import { describe, it, expect } from "vitest";
import {
  DEFAULT_MIN_BOTTLES_TO_COMPLETE,
  DEFAULT_PHYSICAL_BOTTLE_CAPACITY,
  computePalletShipProgress,
  isPalletShippingLocked,
  resolveMinBottlesToShip,
  resolvePhysicalBottleCapacity,
} from "../pallet-ship-progress";
import {
  calculateShippingCostPerBottle,
  calculateShippingCostBreakdown,
} from "../shipping-calculations";

describe("pallet ship progress", () => {
  it("defaults physical capacity to 720 and min to 120", () => {
    expect(DEFAULT_PHYSICAL_BOTTLE_CAPACITY).toBe(720);
    expect(DEFAULT_MIN_BOTTLES_TO_COMPLETE).toBe(120);
    expect(resolvePhysicalBottleCapacity(null)).toBe(720);
    expect(resolveMinBottlesToShip(undefined)).toBe(120);
  });

  it("0 / 120 → not ready", () => {
    const p = computePalletShipProgress(0, 120, 720);
    expect(p.isReadyToShip).toBe(false);
    expect(p.bottlesRemainingToShip).toBe(120);
    expect(p.shipProgressPercent).toBe(0);
    expect(p.physicalBottleCapacity).toBe(720);
    expect(p.minBottlesToShip).toBe(120);
  });

  it("119 / 120 → not ready", () => {
    const p = computePalletShipProgress(119, 120, 720);
    expect(p.isReadyToShip).toBe(false);
    expect(p.bottlesRemainingToShip).toBe(1);
    expect(p.shipProgressPercent).toBe(99.2);
  });

  it("120 / 120 → ready", () => {
    const p = computePalletShipProgress(120, 120, 720);
    expect(p.isReadyToShip).toBe(true);
    expect(p.bottlesRemainingToShip).toBe(0);
    expect(p.shipProgressPercent).toBe(100);
  });

  it("121 / 120 → ready without exceeding 100% display", () => {
    const p = computePalletShipProgress(121, 120, 720);
    expect(p.isReadyToShip).toBe(true);
    expect(p.bottlesRemainingToShip).toBe(0);
    expect(p.shipProgressPercent).toBe(100);
    expect(p.physicalBottleCapacity).toBe(720);
  });

  it("cancellation below threshold clears ready math", () => {
    const ready = computePalletShipProgress(120, 120, 720);
    expect(ready.isReadyToShip).toBe(true);
    const afterCancel = computePalletShipProgress(114, 120, 720);
    expect(afterCancel.isReadyToShip).toBe(false);
    expect(afterCancel.bottlesRemainingToShip).toBe(6);
  });

  it("250 / 120 with physical 720 → ready (not 'incorrectly complete')", () => {
    const p = computePalletShipProgress(250, 120, 720);
    expect(p.isReadyToShip).toBe(true);
    expect(p.physicalBottleCapacity).toBe(720);
    expect(p.minBottlesToShip).toBe(120);
    // Critical regression: old fix route used `filled < bottle_capacity` and
    // would have treated a valid ready pallet as incorrectly complete.
    const legacyWouldMisclassify =
      p.isReadyToShip && p.bottlesFilled < p.physicalBottleCapacity;
    expect(legacyWouldMisclassify).toBe(true);
    expect(p.isReadyToShip).toBe(true);
  });

  it("120 / 720 physical with min 120 must never be classified not-ready", () => {
    const p = computePalletShipProgress(120, 120, 720);
    expect(p.isReadyToShip).toBe(true);
    expect(p.bottlesFilled < p.physicalBottleCapacity).toBe(true);
  });

  it("shipping_ordered stays locked even if fill drops below min", () => {
    expect(isPalletShippingLocked("shipping_ordered")).toBe(true);
    const afterDrop = computePalletShipProgress(114, 120, 720);
    expect(afterDrop.isReadyToShip).toBe(false);
    // Sync must not reopen when locked — lock check is independent of fill math.
    expect(isPalletShippingLocked("shipping_ordered")).toBe(true);
  });
});

describe("legacy capacity-threshold bug", () => {
  it("documents why current_bottles < bottle_capacity must not drive readiness", () => {
    const bottlesFilled = 120;
    const minBottlesToShip = 120;
    const physicalBottleCapacity = 720;
    const isCompleteDb = true;

    const legacyIncorrectlyComplete =
      isCompleteDb && bottlesFilled < physicalBottleCapacity;
    const canonical = computePalletShipProgress(
      bottlesFilled,
      minBottlesToShip,
      physicalBottleCapacity,
    );

    expect(legacyIncorrectlyComplete).toBe(true);
    expect(canonical.isReadyToShip).toBe(true);
    // Fix route must follow canonical, not legacy.
    expect(canonical.isReadyToShip).not.toBe(!legacyIncorrectlyComplete);
  });
});

describe("shipping math uses physical capacity", () => {
  it("does not use min_bottles_to_complete as freight denominator", () => {
    const costCents = 50000;
    const physical = 720;
    const minShip = 120;
    const perBottlePhysical = calculateShippingCostPerBottle(costCents, physical);
    const perBottleIfMin = calculateShippingCostPerBottle(costCents, minShip);
    expect(perBottlePhysical).toBe(Math.round(50000 / 720));
    expect(perBottleIfMin).toBe(Math.round(50000 / 120));
    expect(perBottlePhysical).not.toBe(perBottleIfMin);

    const breakdown = calculateShippingCostBreakdown(costCents, physical, 6, 0);
    expect(breakdown.costPerBottleCents).toBe(perBottlePhysical);
    expect(breakdown.palletShippingCostCents).toBe(perBottlePhysical * 6);
  });
});
