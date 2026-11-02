import { describe, expect, it } from "vitest";

import {
  InvalidWineRegionError,
  buildWinePatch,
} from "@/lib/catalog-mappers";
import {
  WINE_REGION_SLUGS,
  WINE_REGION_VALUES,
  WINE_REGIONS,
  getLinkableWineRegions,
  isWineRegionLinkable,
  isWineRegionSlug,
  isWineRegionValue,
  mapToWineRegionValue,
  parseWineRegionParam,
  resolveWineRegionValue,
  serializeWineRegionParam,
  wineRegionBySlug,
  wineRegionLabel,
  wineRegionSlugFromValue,
} from "@/lib/wine-regions";

describe("wine-regions config", () => {
  it("exposes the ten allowlisted slugs from the plan", () => {
    expect([...WINE_REGION_SLUGS].sort()).toEqual(
      [
        "alsace",
        "beaujolais",
        "bourgogne",
        "champagne",
        "jura",
        "languedoc",
        "loire",
        "rhone",
        "roussillon",
        "sud-ouest",
      ].sort(),
    );
    expect(WINE_REGIONS).toHaveLength(10);
    expect(WINE_REGION_VALUES).toHaveLength(10);
  });

  it("uses the specified EN labels", () => {
    expect(wineRegionBySlug("sud-ouest")?.labelEn).toBe("South West France");
    expect(wineRegionBySlug("bourgogne")?.labelEn).toBe("Burgundy");
    expect(wineRegionBySlug("rhone")?.labelEn).toBe("Rhône Valley");
    expect(wineRegionBySlug("languedoc")?.labelEn).toBe("Languedoc");
    expect(wineRegionLabel("Rhône", "en")).toBe("Rhône Valley");
    expect(wineRegionLabel("sud-ouest", "sv")).toBe("Sydvästra Frankrike");
  });

  it("maps slug ↔ value", () => {
    expect(wineRegionSlugFromValue("Rhône")).toBe("rhone");
    expect(wineRegionSlugFromValue("Sud-Ouest")).toBe("sud-ouest");
    expect(wineRegionBySlug("rhone")?.value).toBe("Rhône");
    expect(isWineRegionValue("Rhône")).toBe(true);
    expect(isWineRegionValue("Vallée du Rhône")).toBe(false);
    expect(isWineRegionSlug("rhone")).toBe(true);
    expect(isWineRegionSlug("Rhône")).toBe(false);
  });
});

describe("mapToWineRegionValue / resolveWineRegionValue", () => {
  it("maps synonyms onto the allowlist", () => {
    expect(mapToWineRegionValue("Vallée du Rhône")).toBe("Rhône");
    expect(mapToWineRegionValue("Rhone")).toBe("Rhône");
    expect(mapToWineRegionValue("Rhone Valley")).toBe("Rhône");
    expect(mapToWineRegionValue("Burgundy")).toBe("Bourgogne");
    expect(mapToWineRegionValue("South West France")).toBe("Sud-Ouest");
    expect(mapToWineRegionValue("Sud Ouest")).toBe("Sud-Ouest");
    expect(mapToWineRegionValue("Aveyron")).toBe("Sud-Ouest");
    expect(mapToWineRegionValue("Languedoc")).toBe("Languedoc");
  });

  it("leaves Corse / Provence / Bugey unmapped", () => {
    expect(mapToWineRegionValue("Corse")).toBeNull();
    expect(mapToWineRegionValue("Provence")).toBeNull();
    expect(mapToWineRegionValue("Bugey")).toBeNull();
    expect(mapToWineRegionValue("Bordeaux")).toBeNull();
    expect(mapToWineRegionValue("Auvergne")).toBeNull();
    expect(mapToWineRegionValue("")).toBeNull();
    expect(mapToWineRegionValue(null)).toBeNull();
  });

  it("keeps an already-allowlisted wine region over producer (Denogent case)", () => {
    expect(
      resolveWineRegionValue({
        wineRegion: "Beaujolais",
        producerRegion: "Bourgogne",
      }),
    ).toBe("Beaujolais");
  });

  it("maps from producer when wine region is unmappable (braconnage-style)", () => {
    expect(
      resolveWineRegionValue({
        wineRegion: "Auvergne",
        producerRegion: "Loire",
      }),
    ).toBe("Loire");
  });

  it("returns null when neither side maps", () => {
    expect(
      resolveWineRegionValue({
        wineRegion: "Corse",
        producerRegion: "Corse",
      }),
    ).toBeNull();
  });
});

describe("region query + linkability helpers", () => {
  it("parses and serializes ?region= slugs", () => {
    expect(parseWineRegionParam("loire,jura")).toEqual(["loire", "jura"]);
    expect(serializeWineRegionParam(["loire", "jura"])).toBe("jura,loire");
  });

  it("gates linkable regions at ≥1 live wine", () => {
    const counts = new Map([["Loire", 8], ["Jura", 0]]);
    expect(getLinkableWineRegions(counts).map((r) => r.slug)).toEqual(["loire"]);
    expect(isWineRegionLinkable("jura", counts)).toBe(false);
  });
});

describe("buildWinePatch region allowlist", () => {
  it("accepts allowlisted region and null", () => {
    expect(buildWinePatch({ region: "Loire" }).region).toBe("Loire");
    expect(buildWinePatch({ region: "Rhône" }).region).toBe("Rhône");
    expect(buildWinePatch({ region: null }).region).toBeNull();
    expect(buildWinePatch({ region: "  " }).region).toBeNull();
  });

  it("rejects non-allowlisted region strings", () => {
    expect(() => buildWinePatch({ region: "Corse" })).toThrow(
      InvalidWineRegionError,
    );
    expect(() => buildWinePatch({ region: "Vallée du Rhône" })).toThrow(
      InvalidWineRegionError,
    );
  });
});
