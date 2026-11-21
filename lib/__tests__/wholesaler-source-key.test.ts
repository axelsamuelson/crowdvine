import { describe, expect, it } from "vitest";
import { resolvePackingSourceId } from "@/lib/cart/packing-source";
import {
  isWholesalerSourceKey,
  normalizeWholesalerSourceKey,
  wholesalerNameFromSourceKey,
  wholesalerSourceKeyFromName,
} from "@/lib/admin/wholesaler-source-key";
import { isExcludedKallorProducerName } from "@/lib/admin/kallor-excluded-producers";

describe("wholesaler source key matching", () => {
  it("matches resolvePackingSourceId for wholesaler wines", () => {
    const name = "Le Clos Saint Gabriel";
    const fromHelper = wholesalerSourceKeyFromName(name);
    const fromPacking = resolvePackingSourceId({
      sourceType: "wholesaler",
      sourceName: name,
    });
    expect(fromHelper).toBe(fromPacking);
    expect(fromHelper).toBe("wholesaler:le clos saint gabriel");
  });

  it("normalizes casing and whitespace the same way as packing", () => {
    expect(wholesalerSourceKeyFromName("  LE CLOS SAINT GABRIEL ")).toBe(
      "wholesaler:le clos saint gabriel",
    );
    expect(normalizeWholesalerSourceKey("wholesaler:Le Clos Saint Gabriel")).toBe(
      "wholesaler:le clos saint gabriel",
    );
    expect(normalizeWholesalerSourceKey("Le Clos Saint Gabriel")).toBe(
      "wholesaler:le clos saint gabriel",
    );
  });

  it("detects wholesaler keys and extracts name fragment", () => {
    expect(isWholesalerSourceKey("wholesaler:acme")).toBe(true);
    expect(isWholesalerSourceKey("producer:uuid")).toBe(false);
    expect(wholesalerNameFromSourceKey("wholesaler:acme wine")).toBe("acme wine");
    expect(wholesalerNameFromSourceKey("producer:x")).toBeNull();
  });

  it("uses unknown-wholesaler when name is empty (same as packing)", () => {
    expect(wholesalerSourceKeyFromName("")).toBe(
      resolvePackingSourceId({ sourceType: "wholesaler", sourceName: "" }),
    );
    expect(wholesalerSourceKeyFromName(null)).toBe(
      "wholesaler:unknown-wholesaler",
    );
  });
});

describe("kallor excluded producers", () => {
  it("excludes Théo Salvat / fake local testing producer", () => {
    expect(isExcludedKallorProducerName("Théo Salvat")).toBe(true);
    expect(isExcludedKallorProducerName("Theo Salvat")).toBe(true);
    expect(isExcludedKallorProducerName("Fake producer for local testing")).toBe(
      true,
    );
    expect(isExcludedKallorProducerName("Domaine Real")).toBe(false);
  });
});
