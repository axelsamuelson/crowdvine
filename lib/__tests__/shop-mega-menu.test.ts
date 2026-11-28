import { describe, expect, it } from "vitest";

import {
  MEGA_MENU_IMAGES,
  MEGA_MENU_IMAGE_TILES,
} from "@/lib/nav/mega-menu-images";
import {
  NEW_WINES_LISTING_PATH,
  columnsFromCatalog,
  rankMegaMenuRegions,
} from "@/lib/nav/shop-mega-menu";
import { countWinesForFilter } from "@/lib/nav/shop-menu-catalog";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";

describe("shop mega menu", () => {
  it("sorts regions by live count and keeps at most eight", () => {
    const ranked = rankMegaMenuRegions(
      [
        { href: "/vin/naturvin-loire", label: "Loire", count: 4 },
        { href: "/vin/naturvin-languedoc", label: "Languedoc", count: 20 },
        { href: "/vin/naturvin-beaujolais", label: "Beaujolais", count: 4 },
        { href: "/a", label: "A", count: 3 },
        { href: "/b", label: "B", count: 3 },
        { href: "/c", label: "C", count: 3 },
        { href: "/d", label: "D", count: 3 },
        { href: "/e", label: "E", count: 3 },
        { href: "/f", label: "F", count: 3 },
      ],
    );
    expect(ranked).toHaveLength(8);
    expect(ranked[0]).toEqual({
      href: "/vin/naturvin-languedoc",
      label: "Languedoc",
    });
    expect(ranked[1].label).toBe("Beaujolais");
    expect(ranked[2].label).toBe("Loire");
    expect(ranked.map((link) => link.label)).not.toContain("F");
  });

  it("points Carignan at the natural-wine slug and leaves new wines unlinked", () => {
    expect(getWineCategorySv("carignan-naturvin")?.canonical).toBe(
      "/vin/carignan-naturvin",
    );
    expect(getWineCategoryEn("carignan-natural-wine")?.canonical).toBe(
      "/wine/carignan-natural-wine",
    );
    expect(NEW_WINES_LISTING_PATH).toBeNull();
  });

  it("keeps the image column off and records the missing orange photo", () => {
    expect(MEGA_MENU_IMAGES).toBe(false);
    expect(MEGA_MENU_IMAGE_TILES.sv[0].src).toBe("/images/hero_bild_5.webp");
    expect(MEGA_MENU_IMAGE_TILES.sv[1]).toMatchObject({
      href: "/vin/orange-naturvin",
      src: null,
    });
    expect(MEGA_MENU_IMAGE_TILES.en[1].src).toBeNull();
  });

  it("shows every menu link when the catalog query fails", () => {
    const columns = columnsFromCatalog("sv", null);
    const hrefs = columns.flatMap((column) => column.links.map((link) => link.href));
    expect(hrefs).toContain("/vin");
    expect(hrefs).toContain("/vin/rott-naturvin");
    expect(hrefs).toContain("/vin/carignan-naturvin");
    expect(hrefs).toContain("/vin/naturvin-languedoc");
    expect(hrefs).toContain("/vin/naturvin-lada");
    expect(hrefs).toContain("/guider");
  });

  it("drops an empty colour and keeps a grape that the catalog lists", () => {
    const red = getWineCategorySv("rott-naturvin");
    const white = getWineCategorySv("vitt-naturvin");
    expect(red && countWinesForFilter([{ color: "Red", grape_varieties: "Carignan", tags: [], region: "Languedoc" }], red.filter)).toBe(1);
    expect(white && countWinesForFilter([{ color: "Red", grape_varieties: "Carignan", tags: [], region: "Languedoc" }], white.filter)).toBe(0);

    const columns = columnsFromCatalog("sv", {
      shopLive: true,
      boxesLive: false,
      regionCounts: { Languedoc: 4 },
      wines: [
        {
          color: "Red",
          grape_varieties: "Grenache Blanc",
          tags: ["sparkling"],
          region: "Languedoc",
        },
      ],
    });
    const hrefs = columns.flatMap((column) => column.links.map((link) => link.href));
    expect(hrefs).toContain("/vin/rott-naturvin");
    expect(hrefs).not.toContain("/vin/vitt-naturvin");
    expect(hrefs).toContain("/vin/grenache");
    expect(hrefs).toContain("/vin/grenache-blanc");
    expect(hrefs).toContain("/vin/mousserande-vin");
    expect(hrefs).not.toContain("/vin/pet-nat");
    expect(hrefs).not.toContain("/vin/naturvin-lada");
    expect(hrefs).toContain("/vin/naturvin-languedoc");
  });
});
