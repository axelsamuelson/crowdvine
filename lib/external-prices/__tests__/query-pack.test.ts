import { describe, it, expect } from "vitest";
import { buildQueryPack } from "../query-pack";
import type { WineForMatch } from "../types";

describe("buildQueryPack", () => {
  it("returns producer + wine_name + vintage first when all present", () => {
    const wine: WineForMatch = {
      id: "1",
      wine_name: "Puligny-Montrachet",
      vintage: "2020",
      producer: { name: "Domaine Leflaive" },
    };
    const pack = buildQueryPack(wine);
    expect(pack[0]).toBe("Domaine Leflaive Puligny-Montrachet 2020");
    expect(pack).toContain("Domaine Leflaive Puligny-Montrachet");
    expect(pack).toContain("Puligny-Montrachet 2020");
    expect(pack).toContain("Domaine Leflaive 2020");
    expect(pack).toContain("Puligny-Montrachet");
  });

  it("omits empty segments and dedupes", () => {
    const wine: WineForMatch = {
      id: "1",
      wine_name: "Rouge",
      vintage: "",
      producer: { name: "Patrick Bouju" },
    };
    const pack = buildQueryPack(wine);
    expect(pack).not.toContain("");
    expect(pack).toContain("Patrick Bouju Rouge");
    expect(pack).toContain("Rouge");
    expect(pack.filter((q) => q === "Rouge").length).toBe(1);
  });

  it("returns only wine_name when no producer or vintage", () => {
    const wine: WineForMatch = {
      id: "1",
      wine_name: "Some Wine",
      vintage: "",
      producer: null,
    };
    const pack = buildQueryPack(wine);
    expect(pack).toEqual(["Some Wine"]);
  });
});
