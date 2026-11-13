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
  it("exposes the fourteen allowlisted slugs (10 + Corse/Provence/Savoie/Bugey)", () => {
    expect([...WINE_REGION_SLUGS].sort()).toEqual(
      [
        "alsace",
        "beaujolais",
        "bourgogne",
        "bugey",
        "champagne",
        "corse",
        "jura",
        "languedoc",
        "loire",
        "provence",
        "rhone",
        "roussillon",
        "savoie",
        "sud-ouest",
      ].sort(),
    );
    expect(WINE_REGIONS).toHaveLength(14);
    expect(WINE_REGION_VALUES).toHaveLength(14);
    expect(WINE_REGION_VALUES).toEqual(
      expect.arrayContaining(["Corse", "Provence", "Savoie", "Bugey"]),
    );
  });

  it("uses the specified EN labels", () => {
    expect(wineRegionBySlug("sud-ouest")?.labelEn).toBe("Southwest France");
    expect(wineRegionBySlug("bourgogne")?.labelEn).toBe("Burgundy");
    expect(wineRegionBySlug("rhone")?.labelEn).toBe("Rhône Valley");
    expect(wineRegionBySlug("languedoc")?.labelEn).toBe("Languedoc");
    expect(wineRegionLabel("Rhône", "en")).toBe("Rhône Valley");
    expect(wineRegionLabel("sud-ouest", "sv")).toBe(
      "Sydvästra Frankrike (Sud-Ouest)",
    );
    expect(wineRegionPageH1(wineRegionBySlug("sud-ouest")!, "en")).toBe(
      "Natural wine from Southwest France",
    );
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
    expect(mapToWineRegionValue("Southwest France")).toBe("Sud-Ouest");
    expect(mapToWineRegionValue("Sud Ouest")).toBe("Sud-Ouest");
    expect(mapToWineRegionValue("Aveyron")).toBe("Sud-Ouest");
    expect(mapToWineRegionValue("Languedoc")).toBe("Languedoc");
  });

  it("maps Corse / Provence / Savoie / Bugey; leaves others unmapped", () => {
    expect(mapToWineRegionValue("Corse")).toBe("Corse");
    expect(mapToWineRegionValue("Provence")).toBe("Provence");
    expect(mapToWineRegionValue("Savoie")).toBe("Savoie");
    expect(mapToWineRegionValue("Bugey")).toBe("Bugey");
    expect(mapToWineRegionValue("Corsica")).toBe("Corse");
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
        wineRegion: "Bordeaux",
        producerRegion: "Auvergne",
      }),
    ).toBeNull();
  });

  it("accepts newly allowlisted Corse from producer/wine", () => {
    expect(
      resolveWineRegionValue({
        wineRegion: "Corse",
        producerRegion: "Corse",
      }),
    ).toBe("Corse");
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
    expect(getWineRegionPageHref("loire", "sv", counts)).toBe(
      "/vin/naturvin-loire",
    );
    expect(getWineRegionPageHref("loire", "en", counts)).toBe(
      "/wine/loire-natural-wine",
    );
    expect(getWineRegionPageHref("beaujolais", "sv", counts)).toBe(
      "/vin/naturvin-beaujolais",
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
    ).toBe("/wine/loire-natural-wine");
  });

  it("builds locale paths and switches them", () => {
    expect(wineRegionPagePath("rhone", "sv")).toBe("/vin/naturvin-rhone");
    expect(wineRegionPagePath("rhone", "en")).toBe("/wine/rhone-natural-wine");
    expect(wineRegionPagePath("bourgogne", "en")).toBe(
      "/wine/burgundy-natural-wine",
    );
    expect(wineRegionPagePath("sud-ouest", "en")).toBe(
      "/wine/southwest-france-natural-wine",
    );
    expect(switchWineRegionPath("/vin/naturvin-loire", "en")).toBe(
      "/wine/loire-natural-wine",
    );
    expect(switchWineRegionPath("/wine/burgundy-natural-wine", "sv")).toBe(
      "/vin/naturvin-bourgogne",
    );
    expect(switchWineRegionPath("/region/languedoc", "en")).toBe(
      "/wine/languedoc-natural-wine",
    );
    expect(switchWineRegionPath("/regions/loire", "sv")).toBe(
      "/vin/naturvin-loire",
    );
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

  it("accepts newly allowlisted Corse / Provence / Savoie / Bugey", () => {
    expect(buildWinePatch({ region: "Corse" }).region).toBe("Corse");
    expect(buildWinePatch({ region: "Provence" }).region).toBe("Provence");
    expect(buildWinePatch({ region: "Savoie" }).region).toBe("Savoie");
    expect(buildWinePatch({ region: "Bugey" }).region).toBe("Bugey");
  });

  it("rejects non-allowlisted region strings", () => {
    expect(() => buildWinePatch({ region: "Bordeaux" })).toThrow(
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

  it("SV meta ends with Hemleverans i Sverige; EN omits home delivery; never hela Sverige", () => {
    for (const region of WINE_REGIONS) {
      const sv = wineRegionPageMetaDescription(region, "sv");
      const en = wineRegionPageMetaDescription(region, "en");
      expect(sv.endsWith("Hemleverans i Sverige.")).toBe(true);
      expect(en.endsWith("at PACT.")).toBe(true);
      expect(en.toLowerCase()).not.toContain("budbee");
      expect(en.toLowerCase()).not.toContain("home delivery");
      expect(sv.toLowerCase()).not.toContain("hela sverige");
      expect(en.toLowerCase()).not.toContain("hela sverige");
      expect(en.toLowerCase()).not.toContain("all of sweden");
    }
  });

  it("keeps the Languedoc pallet intro and omits intro elsewhere", () => {
    expect(getWineRegionContent("languedoc", "sv").intro).toBe(
      "Naturvin från Languedoc som skickas på delade pallar.",
    );
    expect(getWineRegionContent("languedoc", "en").intro).toBe(
      "Natural wine from the Languedoc, shipped on shared pallets.",
    );

    for (const region of WINE_REGIONS) {
      if (region.slug === "languedoc") continue;
      expect(getWineRegionContent(region.slug, "sv").intro ?? "").toBe("");
      expect(getWineRegionContent(region.slug, "en").intro ?? "").toBe("");
    }
  });

  it("omits wholesaler/grossist wording from intros and meta", () => {
    const forbidden = [
      "köpt via grossist i Languedoc och samlastad på samma pall",
      "bought through a wholesaler in the Languedoc and shipped on the same shared pallet",
      "grossist",
      "wholesaler",
      "samlastad",
    ];
    for (const region of WINE_REGIONS) {
      const texts = [
        getWineRegionContent(region.slug, "sv").intro ?? "",
        getWineRegionContent(region.slug, "en").intro ?? "",
        wineRegionPageMetaDescription(region, "sv"),
        wineRegionPageMetaDescription(region, "en"),
      ];
      for (const text of texts) {
        const lower = text.toLowerCase();
        for (const phrase of forbidden) {
          expect(lower).not.toContain(phrase.toLowerCase());
        }
      }
    }
  });
});
