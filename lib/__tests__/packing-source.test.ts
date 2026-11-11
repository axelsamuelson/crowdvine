import { describe, expect, it } from "vitest";
import {
  bottlesNeededForPack,
  computePackingSourceProgress,
  isValidPackBottleCount,
  PACK_BOTTLES_PER_SOURCE,
  packingSourcesAreValid,
  resolvePackingSourceId,
} from "@/lib/cart/packing-source";

describe("packing source identity", () => {
  it("packs producers by producer_id", () => {
    expect(
      resolvePackingSourceId({
        sourceType: "producer",
        producerId: "abc",
        sourceName: "ignored",
      }),
    ).toBe("producer:abc");
  });

  it("packs wholesalers by source_name (case-insensitive)", () => {
    expect(
      resolvePackingSourceId({
        sourceType: "wholesaler",
        sourceName: "Le Clos Saint Gabriel",
        producerId: "abc",
      }),
    ).toBe("wholesaler:le clos saint gabriel");
  });
});

describe("pack bottle counts", () => {
  it("requires multiples of 6", () => {
    expect(PACK_BOTTLES_PER_SOURCE).toBe(6);
    expect(isValidPackBottleCount(6)).toBe(true);
    expect(isValidPackBottleCount(12)).toBe(true);
    expect(isValidPackBottleCount(0)).toBe(false);
    expect(isValidPackBottleCount(5)).toBe(false);
    expect(isValidPackBottleCount(7)).toBe(false);
    expect(bottlesNeededForPack(4)).toBe(2);
    expect(bottlesNeededForPack(6)).toBe(0);
    expect(bottlesNeededForPack(0)).toBe(6);
  });
});

describe("computePackingSourceProgress", () => {
  it("mixes wines within one producer toward 6", () => {
    const rows = computePackingSourceProgress([
      { quantity: 2, sourceType: "producer", producerId: "p1", displayName: "A" },
      { quantity: 4, sourceType: "producer", producerId: "p1", displayName: "A" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.quantity).toBe(6);
    expect(rows[0]!.isValid).toBe(true);
  });

  it("keeps separate producers separate", () => {
    const rows = computePackingSourceProgress([
      { quantity: 3, sourceType: "producer", producerId: "p1", displayName: "A" },
      { quantity: 3, sourceType: "producer", producerId: "p2", displayName: "B" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.needed === 3)).toBe(true);
    expect(packingSourcesAreValid([
      { quantity: 3, sourceType: "producer", producerId: "p1" },
      { quantity: 3, sourceType: "producer", producerId: "p2" },
    ])).toBe(false);
  });

  it("groups wholesaler wines by source_name even with different producers", () => {
    const rows = computePackingSourceProgress([
      {
        quantity: 2,
        sourceType: "wholesaler",
        sourceName: "Le Clos Saint Gabriel",
        producerId: "p1",
      },
      {
        quantity: 4,
        sourceType: "wholesaler",
        sourceName: "Le Clos Saint Gabriel",
        producerId: "p2",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("wholesaler");
    expect(rows[0]!.isValid).toBe(true);
  });
});
