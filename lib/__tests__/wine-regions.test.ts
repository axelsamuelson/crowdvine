import { describe, expect, it } from "vitest";

import {
  InvalidWineRegionError,
  buildWinePatch,
} from "@/lib/catalog-mappers";
import {
  WINE_REGION_INDEX_MIN_LIVE,
  WINE_REGION_SLUGS,
  WINE_REGION_VALUES,
  WINE_REGIONS,
  getLinkableWineRegions,
  getWineRegionPageHref,
  isWineRegionLinkable,
  isWineRegionSlug,
  isWineRegionValue,
  mapToWineRegionValue,
  parseWineRegionParam,
  resolveWineRegionValue,
  serializeWineRegionParam,
  switchWineRegionPath,
  wineRegionBySlug,
  wineRegionEnWithArticle,
  wineRegionLabel,
  wineRegionPageH1,
  wineRegionPageMetaDescription,
  wineRegionPagePath,
  wineRegionPageTitle,
  wineRegionSlugFromValue,
} from "@/lib/wine-regions";
import { getWineRegionContent } from "@/lib/region-content";

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

  it("getWineRegionPageHref only returns when ≥1 live wine", () => {
    const counts = new Map([
      ["Loire", 8],
      ["Beaujolais", 2],
      ["Jura", 0],
    ]);
    expect(getWineRegionPageHref("loire", "sv", counts)).toBe("/region/loire");
    expect(getWineRegionPageHref("loire", "en", counts)).toBe("/regions/loire");
    expect(getWineRegionPageHref("beaujolais", "sv", counts)).toBe(
      "/region/beaujolais",
    );
    expect(getWineRegionPageHref("jura", "sv", counts)).toBeNull();
    expect(
      getWineRegionPageHref(
        "beaujolais",
        "en",
        counts,
        WINE_REGION_INDEX_MIN_LIVE,
      ),
    ).toBeNull();
    expect(
      getWineRegionPageHref("loire", "en", counts, WINE_REGION_INDEX_MIN_LIVE),
    ).toBe("/regions/loire");
  });

  it("builds locale paths and switches them", () => {
    expect(wineRegionPagePath("rhone", "sv")).toBe("/region/rhone");
    expect(wineRegionPagePath("rhone", "en")).toBe("/regions/rhone");
    expect(switchWineRegionPath("/region/languedoc", "en")).toBe(
      "/regions/languedoc",
    );
    expect(switchWineRegionPath("/regions/loire", "sv")).toBe("/region/loire");
    expect(switchWineRegionPath("/vin", "en")).toBeNull();
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

describe("Margaux region landing copy", () => {
  it("builds SV/EN H1 with configurable EN article", () => {
    expect(wineRegionPageH1(wineRegionBySlug("languedoc")!, "sv")).toBe(
      "Naturvin från Languedoc",
    );
    expect(wineRegionPageH1(wineRegionBySlug("languedoc")!, "en")).toBe(
      "Natural wine from the Languedoc",
    );
    expect(wineRegionPageH1(wineRegionBySlug("loire")!, "en")).toBe(
      "Natural wine from the Loire",
    );
    expect(wineRegionPageH1(wineRegionBySlug("beaujolais")!, "en")).toBe(
      "Natural wine from Beaujolais",
    );
    expect(wineRegionPageH1(wineRegionBySlug("jura")!, "en")).toBe(
      "Natural wine from the Jura",
    );
    expect(wineRegionPageH1(wineRegionBySlug("alsace")!, "en")).toBe(
      "Natural wine from Alsace",
    );
    expect(wineRegionPageH1(wineRegionBySlug("bourgogne")!, "en")).toBe(
      "Natural wine from Burgundy",
    );
    expect(wineRegionPageH1(wineRegionBySlug("rhone")!, "en")).toBe(
      "Natural wine from the Rhône Valley",
    );
    expect(wineRegionPageH1(wineRegionBySlug("roussillon")!, "en")).toBe(
      "Natural wine from Roussillon",
    );
    expect(wineRegionEnWithArticle(wineRegionBySlug("loire")!)).toBe(
      "the Loire",
    );
    expect(wineRegionEnWithArticle(wineRegionBySlug("bourgogne")!)).toBe(
      "Burgundy",
    );
  });

  it("builds absolute titles without EN article", () => {
    expect(wineRegionPageTitle(wineRegionBySlug("loire")!, "sv")).toBe(
      "Naturvin från Loire – producenter och stil | PACT",
    );
    expect(wineRegionPageTitle(wineRegionBySlug("loire")!, "en")).toBe(
      "Loire Natural Wine – Producers & Styles | PACT",
    );
    expect(wineRegionPageTitle(wineRegionBySlug("bourgogne")!, "en")).toBe(
      "Burgundy Natural Wine – Producers & Styles | PACT",
    );
    expect(wineRegionPageTitle(wineRegionBySlug("rhone")!, "en")).toBe(
      "Rhône Valley Natural Wine – Producers & Styles | PACT",
    );
  });

  it("ends meta descriptions with Budbee and never says hela Sverige", () => {
    for (const region of WINE_REGIONS) {
      const sv = wineRegionPageMetaDescription(region, "sv");
      const en = wineRegionPageMetaDescription(region, "en");
      expect(sv.endsWith("Hemleverans med Budbee.")).toBe(true);
      expect(en.endsWith("Home delivery with Budbee.")).toBe(true);
      expect(sv.toLowerCase()).not.toContain("hela sverige");
      expect(en.toLowerCase()).not.toContain("hela sverige");
      expect(en.toLowerCase()).not.toContain("all of sweden");
    }
  });

  it("uses Languedoc direct-buy intro and wholesaler intro elsewhere", () => {
    expect(getWineRegionContent("languedoc", "sv").intro).toBe(
      "Naturvin från Languedoc som vi köper direkt av producenterna och skickar på delade pallar.",
    );
    expect(getWineRegionContent("languedoc", "en").intro).toBe(
      "Natural wine from the Languedoc, bought directly from the producers and shipped on shared pallets.",
    );
    expect(getWineRegionContent("loire", "sv").intro).toBe(
      "Naturvin från Loire, köpt via grossist i Languedoc och samlastad på samma pall.",
    );
    expect(getWineRegionContent("loire", "en").intro).toBe(
      "Natural wine from the Loire, bought through a wholesaler in the Languedoc and shipped on the same shared pallet.",
    );
    expect(getWineRegionContent("bourgogne", "en").intro).toBe(
      "Natural wine from Burgundy, bought through a wholesaler in the Languedoc and shipped on the same shared pallet.",
    );
    expect(getWineRegionContent("rhone", "en").intro).toBe(
      "Natural wine from the Rhône Valley, bought through a wholesaler in the Languedoc and shipped on the same shared pallet.",
    );

    for (const region of WINE_REGIONS) {
      if (region.slug === "languedoc") continue;
      const sv = getWineRegionContent(region.slug, "sv").intro ?? "";
      const en = getWineRegionContent(region.slug, "en").intro ?? "";
      expect(sv.toLowerCase()).not.toContain("direkt");
      expect(en.toLowerCase()).not.toContain("directly");
      expect(en.toLowerCase()).not.toContain("direct");
    }
  });
});
