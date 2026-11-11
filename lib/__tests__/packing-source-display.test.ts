import { describe, expect, it } from "vitest";
import {
  formatPackingSourceCustomerLabel,
  fullBoxCountFromBottles,
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
