import { describe, expect, it } from "vitest";

import { categoryPageRobots } from "@/lib/seo/noindex-robots";
import {
  finalizeShopFilterNavigationUrl,
  promoteShopRegionQueryToPath,
  resolveRegionFilterNavigationUrl,
  selectedWineRegionSlugs,
} from "@/lib/shop/filter-navigation";
import { buildFaqPageJsonLd } from "@/lib/wine-category-faq";
import { mergeWineCategoryContent } from "@/lib/wine-category-content";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";
import {
  WINE_REGION_INDEX_MIN_LIVE,
  indexableWineRegionPaths,
  legacyRegionLandingTarget,
  wineRegionPagePath,
} from "@/lib/wine-regions";

describe("region shop paths", () => {
  it("resolves Loire to the Swedish and English PLPs", () => {
    expect(wineRegionPagePath("loire", "sv")).toBe("/vin/naturvin-loire");
    expect(wineRegionPagePath("loire", "en")).toBe("/wine/loire-natural-wine");
    expect(getWineCategorySv("naturvin-loire")?.filter.wineRegion).toBe("Loire");
    expect(getWineCategorySv("naturvin-loire")?.hreflang).toBe(
      "loire-natural-wine",
    );
    expect(getWineCategoryEn("loire-natural-wine")?.canonical).toBe(
      "/wine/loire-natural-wine",
    );
    expect(getWineCategoryEn("loire-natural-wine")?.filter.wineRegion).toBe(
      "Loire",
    );
  });

  it("uses editorial Loire copy and FAQ JSON-LD", () => {
    const sv = mergeWineCategoryContent(getWineCategorySv("naturvin-loire")!);
    expect(sv.h1).toBe("Naturvin från Loire");
    expect(sv.description).toContain("Loiredalen följer");
    expect(sv.contentHeading).toBe("Om naturvin från Loire");
    expect(sv.longDescription).toContain("sur lie");
    expect(sv.faq?.map((item) => item.question)).toContain(
      "Vad betyder Muscadet sur lie?",
    );
    expect(buildFaqPageJsonLd(sv.faq ?? []).mainEntity).toHaveLength(3);

    const en = mergeWineCategoryContent(
      getWineCategoryEn("loire-natural-wine")!,
    );
    expect(en.h1).toBe("Natural wine from the Loire");
    expect(en.description).toContain("The Loire Valley follows");
    expect(en.longDescription).toContain("sur lie");
    expect(en.faq?.[0]?.question).toBe("Which grapes are grown in the Loire?");
  });

  it("keeps Champagne on the short fallback without empty editorial sections", () => {
    const category = mergeWineCategoryContent(
      getWineCategorySv("naturvin-champagne")!,
    );
    expect(category.h1).toBe("Naturvin från Champagne");
    expect(category.description).toBe("");
    expect(category.longDescription).toBeUndefined();
    expect(category.contentHeading).toBeUndefined();
    expect(category.faq).toBeUndefined();
  });

  it("keeps markdown links in Languedoc FAQ answers", () => {
    const category = mergeWineCategoryContent(
      getWineCategorySv("naturvin-languedoc")!,
    );
    const pairing = category.faq?.find((item) =>
      item.question.startsWith("Vad passar"),
    );
    expect(pairing?.answer).toContain(
      "[guiden om naturvin från Languedoc](/guider/naturvin-languedoc)",
    );
    const jsonLd = buildFaqPageJsonLd(category.faq ?? []);
    const answer = jsonLd.mainEntity.find(
      (item) => item.name === pairing?.question,
    );
    expect(answer?.acceptedAnswer.text).toContain(
      "guiden om naturvin från Languedoc",
    );
    expect(answer?.acceptedAnswer.text).not.toContain("](");
  });
});

describe("region redirects", () => {
  it("sends retired region landings to the shop PLP", () => {
    expect(legacyRegionLandingTarget("/region/loire")).toBe(
      "/vin/naturvin-loire",
    );
    expect(legacyRegionLandingTarget("/regions/bourgogne")).toBe(
      "/wine/burgundy-natural-wine",
    );
    expect(legacyRegionLandingTarget("/region/not-a-region")).toBeNull();
  });

  it("promotes a lone region query and leaves combinations in place", () => {
    expect(promoteShopRegionQueryToPath("/vin?region=loire")).toBe(
      "/vin/naturvin-loire",
    );
    expect(promoteShopRegionQueryToPath("/wine?region=bourgogne")).toBe(
      "/wine/burgundy-natural-wine",
    );
    expect(promoteShopRegionQueryToPath("/vin?region=loire,jura")).toBe(
      "/vin?region=loire,jura",
    );
    expect(promoteShopRegionQueryToPath("/vin?region=loire&sort=price-asc")).toBe(
      "/vin?region=loire&sort=price-asc",
    );
    expect(
      promoteShopRegionQueryToPath("/vin/rott-naturvin?region=loire"),
    ).toBe("/vin/rott-naturvin?region=loire");
  });

  it("navigates one region to its path and colour plus region to the query", () => {
    expect(
      resolveRegionFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin",
        search: "",
        nextSlugs: ["loire"],
      }),
    ).toBe("/vin/naturvin-loire");

    expect(
      resolveRegionFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/naturvin-loire",
        search: "",
        nextSlugs: [],
      }),
    ).toBe("/vin");

    expect(
      resolveRegionFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/rott-naturvin",
        search: "",
        nextSlugs: ["loire"],
      }),
    ).toBe("/vin/rott-naturvin?region=loire");

    expect(
      finalizeShopFilterNavigationUrl(
        "/vin/rott-naturvin",
        "/vin/naturvin-loire",
        "",
      ),
    ).toBe("/vin/rott-naturvin?region=loire");

    expect(selectedWineRegionSlugs("/vin/naturvin-loire", [])).toEqual([
      "loire",
    ]);
  });
});

describe("region index threshold", () => {
  const counts = new Map<string, number>([
    ["Loire", 8],
    ["Alsace", 2],
    ["Champagne", 2],
  ]);

  it("omits regions under the live-wine minimum from the sitemap", () => {
    const paths = indexableWineRegionPaths(counts);
    expect(WINE_REGION_INDEX_MIN_LIVE).toBe(3);
    expect(paths).toEqual([
      { sv: "/vin/naturvin-loire", en: "/wine/loire-natural-wine" },
    ]);
    expect(paths.some((path) => path.sv.includes("alsace"))).toBe(false);
    expect(paths.some((path) => path.sv.includes("champagne"))).toBe(false);
  });

  it("noindexes region pages under the minimum and indexes Loire without query params", () => {
    expect(
      categoryPageRobots("naturvin-alsace", "sv", undefined, {
        regionBelowIndexMinimum: true,
      }),
    ).toEqual({ index: false, follow: true });
    expect(
      categoryPageRobots("naturvin-loire", "sv", undefined, {
        emptyListing: false,
        regionBelowIndexMinimum: false,
      }),
    ).toBeUndefined();
    expect(
      categoryPageRobots("naturvin-loire", "sv", { region: "jura" }, {
        regionBelowIndexMinimum: false,
      }),
    ).toEqual({ index: false, follow: true });
    expect(
      categoryPageRobots("naturvin-champagne", "sv", undefined, {
        emptyListing: true,
        regionBelowIndexMinimum: true,
      }),
    ).toEqual({ index: false, follow: true });
  });
});
