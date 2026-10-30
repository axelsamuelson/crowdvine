import { describe, expect, it } from "vitest";
import {
  estimatePalletWeightKg,
  isPalletWeightOverLimit,
  isPickupSelectionTriggerReached,
  suggestPickupProducer,
} from "@/lib/pallet-pickup-suggestion";
import { resolvePalletPhysicalSettings } from "@/lib/pallet-physical-settings";
import { DEFAULT_MIN_BOTTLES_TO_COMPLETE } from "@/lib/pallet-ship-progress";

describe("suggestPickupProducer", () => {
  it("returns the leading pallet-zone producer when ≥ 20%", () => {
    const result = suggestPickupProducer(
      [
        { producerId: "a", bottles: 30, isPalletZone: true, name: "A" },
        { producerId: "b", bottles: 70, isPalletZone: true, name: "B" },
        { producerId: "c", bottles: 50, isPalletZone: false, name: "C" },
      ],
      150,
    );
    expect(result.producerId).toBe("b");
    expect(result.producerName).toBe("B");
    expect(result.meetsThreshold).toBe(true);
    expect(result.bottles).toBe(70);
  });

  it("returns null suggestion when leader is under 20%", () => {
    const result = suggestPickupProducer(
      [
        { producerId: "a", bottles: 10, isPalletZone: true, name: "A" },
        { producerId: "b", bottles: 90, isPalletZone: false, name: "B" },
      ],
      100,
    );
    expect(result.producerId).toBeNull();
    expect(result.meetsThreshold).toBe(false);
    expect(result.bottles).toBe(10);
    expect(result.thresholdBottles).toBe(20);
  });

  it("ignores non–pallet-zone producers even if they lead", () => {
    const result = suggestPickupProducer(
      [
        { producerId: "zone", bottles: 25, isPalletZone: true, name: "Zone" },
        { producerId: "other", bottles: 75, isPalletZone: false, name: "Other" },
      ],
      100,
    );
    expect(result.producerId).toBe("zone");
    expect(result.meetsThreshold).toBe(true);
  });

  it("ties break by producer id", () => {
    const result = suggestPickupProducer(
      [
        { producerId: "z", bottles: 50, isPalletZone: true, name: "Z" },
        { producerId: "a", bottles: 50, isPalletZone: true, name: "A" },
      ],
      100,
    );
    expect(result.producerId).toBe("a");
  });
});

describe("isPickupSelectionTriggerReached", () => {
  it("defaults to 80% of 120 = 96 bottles", () => {
    expect(
      isPickupSelectionTriggerReached({
        bottlesFilled: 95,
        minBottlesToShip: 120,
      }),
    ).toBe(false);
    expect(
      isPickupSelectionTriggerReached({
        bottlesFilled: 96,
        minBottlesToShip: 120,
      }),
    ).toBe(true);
  });

  it("respects custom trigger share", () => {
    expect(
      isPickupSelectionTriggerReached({
        bottlesFilled: 60,
        minBottlesToShip: 120,
        triggerShare: 0.5,
      }),
    ).toBe(true);
  });
});

describe("weight estimate", () => {
  it("estimates kg from bottles × kg/bottle", () => {
    expect(estimatePalletWeightKg(100, 1.4)).toBe(140);
    expect(estimatePalletWeightKg(10, 1.4)).toBe(14);
  });

  it("null weight limit means no over-limit warning", () => {
    expect(isPalletWeightOverLimit(500, null)).toBe(false);
    expect(isPalletWeightOverLimit(501, 500)).toBe(true);
    expect(isPalletWeightOverLimit(500, 500)).toBe(false);
  });
});

describe("resolvePalletPhysicalSettings", () => {
  it("keeps pallet minimum at 270 and defaults trigger/weight", () => {
    const s = resolvePalletPhysicalSettings();
    expect(s.minBottlesToComplete).toBe(DEFAULT_MIN_BOTTLES_TO_COMPLETE);
    expect(s.minBottlesToComplete).toBe(270);
    expect(s.pickupSelectionTriggerShare).toBe(0.8);
    expect(s.kgPerBottle).toBe(1.4);
    expect(s.weightLimitKg).toBeNull();
  });

  it("parses site_content overrides", () => {
    const s = resolvePalletPhysicalSettings({
      pickupSelectionTriggerShare: "0.75",
      weightLimitKg: "400",
      kgPerBottle: "1.5",
    });
    expect(s.pickupSelectionTriggerShare).toBe(0.75);
    expect(s.weightLimitKg).toBe(400);
    expect(s.kgPerBottle).toBe(1.5);
  });

  it("treats empty weight limit as null", () => {
    expect(
      resolvePalletPhysicalSettings({ weightLimitKg: "" }).weightLimitKg,
    ).toBeNull();
  });
});
