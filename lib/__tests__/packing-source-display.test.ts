import { describe, expect, it } from "vitest";
import {
  formatPackingSourceCustomerLabel,
  fullBoxCountFromBottles,
  packingBoxSummary,
  targetBoxCountFromBottles,
  wholesalerBoxRegionLabel,
} from "@/lib/cart/packing-source-display";

describe("packing source customer labels", () => {
  it("never shows wholesaler company names", () => {
    expect(
      formatPackingSourceCustomerLabel({
        kind: "wholesaler",
        producerName: "Le Clos Saint Gabriel",
        regions: ["Languedoc"],
        locale: "sv",
      }),
    ).toBe("Blandlåda från Languedoc");
    expect(
      formatPackingSourceCustomerLabel({
        kind: "wholesaler",
        regions: ["Languedoc", "Roussillon"],
        locale: "sv",
      }),
    ).toBe("Blandlåda från Frankrike");
    expect(
      formatPackingSourceCustomerLabel({
        kind: "wholesaler",
        regions: [],
        locale: "en",
      }),
    ).toBe("Mixed box from France");
  });

  it("uses producer name for producer boxes", () => {
    expect(
      formatPackingSourceCustomerLabel({
        kind: "producer",
        producerName: "Domaine Test",
        locale: "sv",
      }),
    ).toBe("Domaine Test");
  });

  it("counts full boxes", () => {
    expect(fullBoxCountFromBottles(6)).toBe(1);
    expect(fullBoxCountFromBottles(12)).toBe(2);
    expect(fullBoxCountFromBottles(8)).toBe(1);
    expect(wholesalerBoxRegionLabel(["Provence"], "en")).toBe("Provence");
  });
});

describe("packingBoxSummary (Fulla lådor)", () => {
  it("counts boxes not sources — 8 bottles → 1 av 2", () => {
    expect(targetBoxCountFromBottles(8)).toBe(2);
    expect(packingBoxSummary([8])).toEqual({ full: 1, total: 2 });
  });

  it("sums floor/ceil across sources", () => {
    // 6 full + 2 incomplete → 1 av 2
    expect(packingBoxSummary([6, 2])).toEqual({ full: 1, total: 2 });
    // 12 + 8 → full 2+1=3, total 2+2=4
    expect(packingBoxSummary([12, 8])).toEqual({ full: 3, total: 4 });
    expect(packingBoxSummary([6])).toEqual({ full: 1, total: 1 });
    expect(packingBoxSummary([0])).toEqual({ full: 0, total: 0 });
    expect(packingBoxSummary([])).toEqual({ full: 0, total: 0 });
  });
});
