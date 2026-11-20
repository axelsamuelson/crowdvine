import { describe, expect, it } from "vitest";

import { resolveVisibleTasteTags } from "@/components/product/wine-enrichment-specs";
import {
  bestPetNatWinesSystembolagetArticle,
  bestPetNatWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import { getLocalizedPath } from "@/lib/i18n/get-localized-path";
import { isNoindexCategorySlug } from "@/lib/seo/noindex-robots";
import { resolveRegionFilterNavigationUrl } from "@/lib/shop/filter-navigation";
import { scoreWine } from "@/lib/taste-quiz/scoring";
import type { TasteQuizWine } from "@/lib/taste-quiz/get-quiz-wines";
import type { TasteQuizAnswers } from "@/lib/taste-quiz/taste-profile";
import { getCategoryExploreLinks } from "@/lib/wine-category-explore-links";
import type { WineCategory } from "@/lib/wine-category-types";
import {
  getHreflangPath,
  getWineCategoryEn,
  getWineCategorySv,
  wineCategoryCatalogFilters,
  WINE_CATEGORIES_EN,
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";
import {
  isWineRegionShopCategory,
  LEGACY_SHOP_REDIRECT_SLUGS,
} from "@/lib/wine-shop-filter-categories";
import {
  categoryPillShortLabel,
  getActiveStyleFromPathname,
  getCategoryUrlForStyle,
  resolveStylePillLinksForPaths,
  SHOP_STYLE_FILTER_VALUES,
  styleFilterCategorySlug,
  styleFilterLabel,
} from "@/lib/shop/style-category-links";

type TaggedWine = { id: string; tags: string[] };

/**
 * Same rule as `q.contains("tags", [tag])` for every tag on the category:
 * the wine's tag array must include each required tag.
 */
function winesMatchingCategory(
  wines: TaggedWine[],
  category: WineCategory,
): TaggedWine[] {
  const required = wineCategoryCatalogFilters(category.filter).filterTags ?? [];
  return wines.filter((wine) =>
    required.every((tag) => wine.tags.includes(tag)),
  );
}

function categoryCopy(category: WineCategory): string {
  return [
    category.h1,
    category.title,
    category.metaDescription,
    category.description,
    category.descriptionLink?.label,
    category.descriptionLink?.href,
  ].join("\n");
}

const FIXTURES: TaggedWine[] = [
  { id: "still", tags: ["fruit_forward"] },
  { id: "champagne", tags: ["sparkling", "classic"] },
  { id: "pet-nat", tags: ["sparkling", "pet_nat"] },
  { id: "pet-nat-only", tags: ["pet_nat"] },
];

const ANSWERS: TasteQuizAnswers = {
  occasion: "aperitif",
  style: "fresh_fruity",
  color: "white",
  adventure: 3,
  budget: "mid",
};

function quizWine(tags: string[]): TasteQuizWine {
  return {
    id: "1",
    name: "Fixture",
    producer: "Fixture",
    handle: "fixture",
    imageUrl: "/uploads/fixture.jpg",
    color: "White",
    grapes: ["Chenin"],
    soil: "limestone",
    style_scale: 3,
    price: 180,
    tags,
  };
}

describe("sparkling and pet nat categories", () => {
  it("resolves both locales by slug and pairs the hreflang paths", () => {
    const sparklingSv = getWineCategorySv("mousserande-vin");
    const sparklingEn = getWineCategoryEn("sparkling-wine");
    const petNatSv = getWineCategorySv("pet-nat");
    const petNatEn = getWineCategoryEn("pet-nat");

    expect(sparklingSv).toMatchObject({
      canonical: "/vin/mousserande-vin",
      hreflang: "sparkling-wine",
      filter: { tags: ["sparkling"] },
      descriptionLink: { href: "/vin/pet-nat" },
    });
    expect(sparklingEn).toMatchObject({
      canonical: "/wine/sparkling-wine",
      hreflang: "mousserande-vin",
      filter: { tags: ["sparkling"] },
      descriptionLink: { href: "/wine/pet-nat" },
    });
    expect(petNatSv).toMatchObject({
      canonical: "/vin/pet-nat",
      hreflang: "pet-nat",
      filter: { tags: ["pet_nat"] },
      descriptionLink: { href: "/guider/vad-ar-pet-nat" },
    });
    expect(petNatEn).toMatchObject({
      canonical: "/wine/pet-nat",
      hreflang: "pet-nat",
      filter: { tags: ["pet_nat"] },
      descriptionLink: { href: "/guides/what-is-pet-nat" },
    });

    expect(getHreflangPath(sparklingSv!)).toBe("/wine/sparkling-wine");
    expect(getHreflangPath(sparklingEn!)).toBe("/vin/mousserande-vin");
    expect(getLocalizedPath("/vin/mousserande-vin", "en")).toBe(
      "/wine/sparkling-wine",
    );
    expect(getLocalizedPath("/wine/sparkling-wine", "sv")).toBe(
      "/vin/mousserande-vin",
    );
    expect(getLocalizedPath("/vin/pet-nat", "en")).toBe("/wine/pet-nat");
    expect(getLocalizedPath("/wine/pet-nat", "sv")).toBe("/vin/pet-nat");
  });

  it("keeps category filters to wines that carry the tag", () => {
    const sparkling = getWineCategorySv("mousserande-vin")!;
    const petNat = getWineCategoryEn("pet-nat")!;

    expect(winesMatchingCategory(FIXTURES, sparkling).map((wine) => wine.id)).toEqual([
      "champagne",
      "pet-nat",
    ]);
    expect(winesMatchingCategory(FIXTURES, petNat).map((wine) => wine.id)).toEqual([
      "pet-nat",
      "pet-nat-only",
    ]);
    expect(
      winesMatchingCategory(FIXTURES, sparkling).every((wine) =>
        wine.tags.includes("sparkling"),
      ),
    ).toBe(true);
    expect(
      winesMatchingCategory(FIXTURES, petNat).every((wine) =>
        wine.tags.includes("pet_nat"),
      ),
    ).toBe(true);
  });

  it("stays in the sitemap candidate set, with the live-wine check on the tag filter", () => {
    for (const [category, locale] of [
      [getWineCategorySv("mousserande-vin")!, "sv"],
      [getWineCategorySv("pet-nat")!, "sv"],
      [getWineCategoryEn("sparkling-wine")!, "en"],
      [getWineCategoryEn("pet-nat")!, "en"],
    ] as const) {
      const list = locale === "sv" ? WINE_CATEGORIES_SV : WINE_CATEGORIES_EN;
      expect(list.some((item) => item.slug === category.slug)).toBe(true);
      expect(isWineRegionShopCategory(category)).toBe(false);
      expect(isNoindexCategorySlug(category.slug, locale)).toBe(false);
      expect(LEGACY_SHOP_REDIRECT_SLUGS.has(category.slug)).toBe(false);
      expect(wineCategoryCatalogFilters(category.filter).filterTags).toEqual(
        category.filter.tags,
      );
    }
  });

  it("links the style pages from colour hubs and from each other", () => {
    const red = getWineCategorySv("rott-naturvin")!;
    const redHrefs = getCategoryExploreLinks(red).map((link) => link.href);
    expect(redHrefs).toContain("/vin/mousserande-vin");
    expect(redHrefs).toContain("/vin/pet-nat");

    const sparklingHrefs = getCategoryExploreLinks(
      getWineCategoryEn("sparkling-wine")!,
    ).map((link) => link.href);
    expect(sparklingHrefs).toContain("/wine/pet-nat");
    expect(sparklingHrefs).toContain("/guides/what-is-pet-nat");
  });

  it("hides the category tags on the PDP and ignores them in taste scoring", () => {
    expect(
      resolveVisibleTasteTags([
        "fruit_forward",
        "sparkling",
        "pet_nat",
        "classic",
      ]),
    ).toEqual(["fruit_forward"]);

    const base = quizWine(["fruit_forward", "social_wine"]);
    const withCategoryTags = quizWine([
      "fruit_forward",
      "social_wine",
      "sparkling",
      "pet_nat",
    ]);
    expect(scoreWine(withCategoryTags, ANSWERS)).toBe(scoreWine(base, ANSWERS));
  });

  it("keeps a region filter on the pet nat path", () => {
    expect(
      resolveRegionFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/pet-nat",
        search: "",
        nextSlugs: ["loire"],
      }),
    ).toBe("/vin/pet-nat?region=loire");
  });

  it("writes copy without em dashes and links the guides to the shop", () => {
    for (const category of [
      getWineCategorySv("mousserande-vin")!,
      getWineCategorySv("pet-nat")!,
      getWineCategoryEn("sparkling-wine")!,
      getWineCategoryEn("pet-nat")!,
    ]) {
      expect(categoryCopy(category)).not.toMatch(/[—]/);
    }

    const guideHrefs = [
      ...whatIsPetNatArticle.internalLinks.map((link) => link.href),
      ...bestPetNatWinesSystembolagetArticle.internalLinks.map((link) => link.href),
      ...bestPetNatWinesSystembolagetSvArticle.internalLinks.map((link) => link.href),
    ];
    expect(guideHrefs.some((href) => href.sv === "/vin/pet-nat")).toBe(true);
    expect(guideHrefs.some((href) => href.en === "/wine/pet-nat")).toBe(true);
  });

  it("resolves style pills and filter options to locale canonicals and hides empty ones", () => {
    const svNavigable = [
      "/vin",
      "/vin/rott-naturvin",
      "/vin/vitt-naturvin",
      "/vin/orange-naturvin",
      "/vin/mousserande-vin",
      "/vin/pet-nat",
    ];
    const enNavigable = [
      "/wine",
      "/wine/red-natural-wine",
      "/wine/white-natural-wine",
      "/wine/orange-natural-wine",
      "/wine/sparkling-wine",
      "/wine/pet-nat",
    ];

    const svRoot = resolveStylePillLinksForPaths("sv", svNavigable, "root");
    expect(svRoot.map((link) => link.href)).toEqual([
      "/vin/rott-naturvin",
      "/vin/vitt-naturvin",
      "/vin/orange-naturvin",
      "/vin/mousserande-vin",
      "/vin/pet-nat",
    ]);
    expect(svRoot.map((link) => link.label)).toEqual([
      "Rött",
      "Vitt",
      "Orange",
      "Mousserande",
      "Pet nat",
    ]);

    const enRoot = resolveStylePillLinksForPaths("en", enNavigable, "root");
    expect(enRoot.map((link) => link.href)).toEqual([
      "/wine/red-natural-wine",
      "/wine/white-natural-wine",
      "/wine/orange-natural-wine",
      "/wine/sparkling-wine",
      "/wine/pet-nat",
    ]);
    expect(enRoot.map((link) => link.label)).toEqual([
      "Red",
      "White",
      "Orange",
      "Sparkling",
      "Pet nat",
    ]);

    // Zero live wines for sparkling → pill hidden.
    const svWithoutSparkling = resolveStylePillLinksForPaths(
      "sv",
      svNavigable.filter((path) => path !== "/vin/mousserande-vin"),
      "root",
    );
    expect(svWithoutSparkling.map((link) => link.href)).not.toContain(
      "/vin/mousserande-vin",
    );
    expect(svWithoutSparkling.map((link) => link.href)).toContain("/vin/pet-nat");

    const moreSv = resolveStylePillLinksForPaths("sv", svNavigable, "more-styles");
    expect(moreSv.map((link) => link.href)).toEqual([
      "/vin/mousserande-vin",
      "/vin/pet-nat",
    ]);

    for (const value of SHOP_STYLE_FILTER_VALUES) {
      expect(getCategoryUrlForStyle(value, "sv")).toBe(
        `/vin/${styleFilterCategorySlug(value, "sv")}`,
      );
      expect(getCategoryUrlForStyle(value, "en")).toBe(
        `/wine/${styleFilterCategorySlug(value, "en")}`,
      );
    }
    expect(styleFilterLabel("sparkling", "sv")).toBe("Mousserande");
    expect(styleFilterLabel("sparkling", "en")).toBe("Sparkling");
    expect(styleFilterLabel("pet_nat", "sv")).toBe("Pet nat");
    expect(styleFilterLabel("pet_nat", "en")).toBe("Pet nat");
    expect(getActiveStyleFromPathname("/vin/mousserande-vin")).toBe("sparkling");
    expect(getActiveStyleFromPathname("/wine/pet-nat")).toBe("pet_nat");
    expect(getActiveStyleFromPathname("/vin/rott-naturvin")).toBeNull();

    expect(
      categoryPillShortLabel(getWineCategorySv("mousserande-vin")!),
    ).toBe("Mousserande");
    expect(
      categoryPillShortLabel(getWineCategoryEn("sparkling-wine")!),
    ).toBe("Sparkling");
  });
});
