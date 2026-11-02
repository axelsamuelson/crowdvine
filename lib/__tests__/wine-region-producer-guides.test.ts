import { describe, expect, it } from "vitest";

import {
  findProducerGuideHrefForName,
  getWineRegionProducerGuideLinks,
  getWineRegionProducerGuides,
} from "@/lib/wine-region-producer-guides";
import { WINE_REGION_SLUGS } from "@/lib/wine-regions";

describe("wine region → producer guides", () => {
  it("links Beaujolais / Jura / Champagne / Rhône guides", () => {
    expect(getWineRegionProducerGuides("beaujolais").map((g) => g.slug)).toEqual(
      [
        "jean-foillard",
        "marcel-lapierre",
        "guy-breton",
        "jean-paul-thevenet",
        "gang-of-four-wine",
      ],
    );
    expect(getWineRegionProducerGuides("jura").map((g) => g.slug)).toEqual([
      "pierre-overnoy",
      "jean-francois-ganevat",
    ]);
    expect(getWineRegionProducerGuideLinks("champagne", "sv")[0]?.href).toBe(
      "/guider/jacques-selosse",
    );
    expect(getWineRegionProducerGuideLinks("rhone", "en")[0]?.href).toBe(
      "/guides/thierry-allemand",
    );
  });

  it("returns empty for regions without producer guides", () => {
    expect(getWineRegionProducerGuides("loire")).toEqual([]);
    expect(getWineRegionProducerGuides("languedoc")).toEqual([]);
    expect(getWineRegionProducerGuides("sud-ouest")).toEqual([]);
  });

  it("resolves guide hrefs from producer names when a guide exists", () => {
    expect(findProducerGuideHrefForName("Marcel Lapierre", "sv")).toBe(
      "/guider/marcel-lapierre",
    );
    expect(findProducerGuideHrefForName("Pierre Overnoy", "en")).toBe(
      "/guides/pierre-overnoy",
    );
    expect(findProducerGuideHrefForName("Unknown Domaine", "en")).toBeNull();
  });

  it("only references known region slugs", () => {
    for (const slug of WINE_REGION_SLUGS) {
      expect(() => getWineRegionProducerGuides(slug)).not.toThrow();
    }
  });
});
