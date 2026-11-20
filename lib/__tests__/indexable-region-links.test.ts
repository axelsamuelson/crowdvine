import { describe, expect, it } from "vitest";

import { withIndexableShopRegionSection } from "@/lib/guides/guide-hub-region-section";
import { indexableRegionLinksFromCounts } from "@/lib/shop/indexable-region-links";
import { WINE_REGION_INDEX_MIN_LIVE } from "@/lib/wine-regions";

describe("indexableRegionLinksFromCounts", () => {
  const counts = new Map<string, number>([
    ["Languedoc", 12],
    ["Loire", 8],
    ["Jura", 5],
    ["Beaujolais", 4],
    ["Alsace", 2],
    ["Champagne", 1],
  ]);

  it("only includes regions at or above the index minimum", () => {
    expect(WINE_REGION_INDEX_MIN_LIVE).toBe(3);
    const sv = indexableRegionLinksFromCounts("sv", counts);
    const en = indexableRegionLinksFromCounts("en", counts);

    expect(sv.map((l) => l.slug)).toEqual([
      "languedoc",
      "beaujolais",
      "loire",
      "jura",
    ]);
    expect(sv.map((l) => l.href)).toEqual([
      "/vin/naturvin-languedoc",
      "/vin/naturvin-beaujolais",
      "/vin/naturvin-loire",
      "/vin/naturvin-jura",
    ]);
    expect(en.map((l) => l.href)).toEqual([
      "/wine/languedoc-natural-wine",
      "/wine/beaujolais-natural-wine",
      "/wine/loire-natural-wine",
      "/wine/jura-natural-wine",
    ]);
    expect(sv.some((l) => l.slug === "alsace")).toBe(false);
    expect(sv.some((l) => l.slug === "champagne")).toBe(false);
    expect(sv.map((l) => l.label)).toContain("Languedoc");
    expect(en.map((l) => l.label)).toContain("Languedoc");
  });
});

describe("withIndexableShopRegionSection", () => {
  it("replaces French region guide cards with shop PLPs and keeps Georgia (already on main)", () => {
    const links = indexableRegionLinksFromCounts(
      "sv",
      new Map([
        ["Languedoc", 12],
        ["Jura", 5],
        ["Beaujolais", 4],
        ["Alsace", 1],
      ]),
    );
    const sections = withIndexableShopRegionSection(
      [
        {
          title: "Regioner",
          cards: [
            {
              href: "/guider/naturvin-languedoc",
              title: "Naturvin från Languedoc",
              description: "Guide",
            },
            {
              href: "/guider/jura-natural-wine",
              title: "Jura",
              description: "Guide",
            },
            {
              href: "/guider/beaujolais-natural-wine",
              title: "Beaujolais",
              description: "Guide",
            },
            {
              href: "/guider/georgia-natural-wine",
              title: "Georgien naturvin — världens äldsta tradition",
              description: "Guide",
            },
          ],
        },
      ],
      "sv",
      links,
    );

    const region = sections[0]!;
    // Georgia was already in SV_REGION_CARDS on main — preserved as guide-only.
    expect(region.cards.map((c) => c.href)).toEqual([
      "/vin/naturvin-languedoc",
      "/vin/naturvin-beaujolais",
      "/vin/naturvin-jura",
      "/guider/georgia-natural-wine",
    ]);
    expect(region.cards.some((c) => c.href.includes("alsace"))).toBe(false);
  });
});
