import { describe, expect, it } from "vitest";

import {
  getWineRegionGuideArticle,
  getWineRegionGuideHref,
  wineRegionGuideLookupSlug,
} from "@/lib/wine-region-guides";

describe("wine region → guide links", () => {
  it("maps Roussillon to the Languedoc guide via wineRegionSlug", () => {
    expect(wineRegionGuideLookupSlug("roussillon")).toBe("languedoc");
    expect(getWineRegionGuideArticle("roussillon")?.wineRegionSlug).toBe(
      "languedoc",
    );
    expect(getWineRegionGuideHref("roussillon", "sv")).toBe(
      "/guider/naturvin-languedoc",
    );
    expect(getWineRegionGuideHref("roussillon", "en")).toBe(
      "/guides/languedoc-natural-wine",
    );
  });

  it("resolves Beaujolais / Jura / Languedoc article guides", () => {
    expect(getWineRegionGuideHref("languedoc", "en")).toBe(
      "/guides/languedoc-natural-wine",
    );
    expect(getWineRegionGuideHref("beaujolais", "sv")).toBe(
      "/guider/beaujolais-natural-wine",
    );
    expect(getWineRegionGuideHref("jura", "en")).toBe(
      "/guides/jura-natural-wine",
    );
  });

  it("resolves Champagne to the ranked champagne guide", () => {
    expect(getWineRegionGuideHref("champagne", "sv")).toBe(
      "/guider/varldens-basta-naturliga-champagne",
    );
    expect(getWineRegionGuideHref("champagne", "en")).toBe(
      "/guides/worlds-best-natural-champagne",
    );
  });

  it("returns null when no guide owns the region", () => {
    expect(getWineRegionGuideHref("loire", "en")).toBeNull();
    expect(getWineRegionGuideHref("sud-ouest", "sv")).toBeNull();
  });
});
