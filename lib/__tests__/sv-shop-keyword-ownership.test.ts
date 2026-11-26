import { describe, expect, it } from "vitest";

import { categoryPageRobots } from "@/lib/seo/noindex-robots";
import { getShopRootNaturalWineContent } from "@/lib/shop/shop-root-natural-wine-content";
import { mergeWineCategoryContent } from "@/lib/wine-category-content";
import {
  getCategoryUrlForGrape,
  getWineCategoryEn,
  getWineCategorySv,
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";
import { getCategoryExploreLinks } from "@/lib/wine-category-explore-links";
import {
  isColorFarmingComboCategory,
  LEGACY_SHOP_REDIRECT_SLUGS,
} from "@/lib/wine-shop-filter-categories";
import { WINE_COMBO_INDEX_MIN_LIVE } from "@/lib/wine-regions";

const DASH_OR_MIDDLEMAN = /[—–]|utan mellanhänder|direkt från producenterna/;

describe("Swedish shop keyword ownership", () => {
  it("keeps dashes and middleman claims out of titles, metas and intros", () => {
    for (const category of WINE_CATEGORIES_SV) {
      const merged = mergeWineCategoryContent(category);
      for (const field of ["title", "metaDescription", "description"] as const) {
        const value = merged[field] ?? "";
        expect(value, `${merged.slug} ${field}`).not.toMatch(DASH_OR_MIDDLEMAN);
      }
    }
    expect(getShopRootNaturalWineContent("sv").intro).not.toMatch(
      DASH_OR_MIDDLEMAN,
    );
  });

  it("puts the buying intro on the colour and farming hubs", () => {
    expect(mergeWineCategoryContent(getWineCategorySv("orange-naturvin")!).description).toContain(
      "[Vad är orange vin?](/guider/vad-ar-orange-vin)",
    );
    expect(mergeWineCategoryContent(getWineCategorySv("rott-naturvin")!).title).toBe(
      "Rött naturvin: köp rött naturvin online",
    );
    expect(
      mergeWineCategoryContent(getWineCategorySv("biodynamiskt-vin")!).description,
    ).toContain("inte automatiskt naturvin");
    expect(getShopRootNaturalWineContent("sv").intro).toContain(
      "Hemleverans i Stockholm och i resten av Sverige.",
    );
    expect(getWineCategorySv("pet-nat")?.description).toContain(
      "Vi levererar i hela Sverige, på delad pall eller direkt hem.",
    );
    expect(getWineCategorySv("pet-nat")?.description).not.toContain(
      "Vi köper direkt från producenterna",
    );
  });

  it("redirects the duplicate Carignan slug and keeps the natural-wine page", () => {
    expect(getWineCategorySv("carignan")).toBeUndefined();
    expect(getWineCategoryEn("carignan")).toBeUndefined();
    expect(getWineCategorySv("carignan-naturvin")?.canonical).toBe(
      "/vin/carignan-naturvin",
    );
    expect(getWineCategoryEn("carignan-natural-wine")?.filter).toEqual({
      filterGrape: "Carignan",
    });
    expect(LEGACY_SHOP_REDIRECT_SLUGS.has("carignan")).toBe(true);
    expect(getCategoryUrlForGrape("Carignan", "sv")).toBe(
      "/vin/carignan-naturvin",
    );
    expect(getCategoryUrlForGrape("Carignan", "en")).toBe(
      "/wine/carignan-natural-wine",
    );
    expect(
      getCategoryExploreLinks(getWineCategorySv("rott-naturvin")!).map(
        (link) => link.href,
      ),
    ).toContain("/vin/carignan-naturvin");
  });

  it("applies the live-wine floor only to colour and farming combos", () => {
    expect(WINE_COMBO_INDEX_MIN_LIVE).toBe(6);
    expect(
      isColorFarmingComboCategory(getWineCategorySv("rott-biodynamiskt-vin")!),
    ).toBe(true);
    expect(
      isColorFarmingComboCategory(getWineCategorySv("orange-ekologiskt-vin")!),
    ).toBe(true);
    for (const slug of [
      "rott-naturvin",
      "biodynamiskt-vin",
      "ekologiskt-vin",
      "pet-nat",
      "mousserande-vin",
      "carignan-naturvin",
    ]) {
      expect(
        isColorFarmingComboCategory(getWineCategorySv(slug)!),
        slug,
      ).toBe(false);
    }
    expect(
      categoryPageRobots("rott-biodynamiskt-vin", "sv", undefined, {
        comboBelowIndexMinimum: true,
      }),
    ).toEqual({ index: false, follow: true });
    expect(
      categoryPageRobots("rott-ekologiskt-vin", "sv", undefined, {
        comboBelowIndexMinimum: false,
      }),
    ).toBeUndefined();
  });
});
