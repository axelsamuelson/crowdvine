import { describe, expect, it } from "vitest";

import { categoryPageRobots } from "@/lib/seo/noindex-robots";
import {
  finalizeShopFilterNavigationUrl,
  promoteShopCharacterQueryToPath,
  resolveCharacterFilterNavigationUrl,
  selectedWineCharacterValues,
} from "@/lib/shop/filter-navigation";
import { mergeWineCategoryContent } from "@/lib/wine-category-content";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";
import {
  WINE_CHARACTER_FILTERS,
  WINE_CHARACTER_FILTER_VALUES,
  WINE_CHARACTER_INDEX_MIN_LIVE,
  WINE_CHARACTER_PATH_VALUE,
  indexableWineCharacterPaths,
  parseWineCharacterParam,
  productMatchesCharacterValues,
  wineCharacterDbTagsForValues,
  wineCharacterPagePath,
} from "@/lib/wine-character-tags";
import { isWineCharacterShopCategory } from "@/lib/wine-shop-filter-categories";

describe("character filter mapping", () => {
  it("exposes exactly ten filter values in the decided order", () => {
    expect(WINE_CHARACTER_FILTER_VALUES).toEqual([
      "light_easy",
      "fruit_forward",
      "mineral",
      "dinner",
      "aperitif",
      "everyday",
      "classic",
      "first_natural",
      "complex",
      "unusual",
    ]);
    expect(WINE_CHARACTER_FILTERS.map((def) => def.value)).toEqual([
      ...WINE_CHARACTER_FILTER_VALUES,
    ]);
  });

  it("maps complex and unusual to multiple database tags", () => {
    expect(wineCharacterDbTagsForValues(["complex"])).toEqual([
      "structured",
      "complex",
    ]);
    expect(wineCharacterDbTagsForValues(["unusual"])).toEqual([
      "out_of_the_ordinary",
      "funky_wild",
    ]);
    expect(
      productMatchesCharacterValues(["structured"], ["complex"]),
    ).toBe(true);
    expect(
      productMatchesCharacterValues(["funky_wild"], ["unusual"]),
    ).toBe(true);
    expect(
      productMatchesCharacterValues(["social_wine"], ["light_easy"]),
    ).toBe(false);
  });

  it("parses character query values with Zod and ignores unknowns", () => {
    expect(parseWineCharacterParam("fruit_forward,not_a_tag,complex")).toEqual([
      "fruit_forward",
      "complex",
    ]);
    expect(parseWineCharacterParam(["unusual", "dinner"])).toEqual([
      "dinner",
      "unusual",
    ]);
  });
});

describe("character shop paths", () => {
  it("resolves light_easy to Swedish and English PLPs", () => {
    expect(wineCharacterPagePath("light_easy", "sv")).toBe(
      "/vin/lattdruckna-naturviner",
    );
    expect(wineCharacterPagePath("light_easy", "en")).toBe(
      "/wine/easy-drinking-natural-wine",
    );
    expect(wineCharacterPagePath("fruit_forward", "sv")).toBeNull();

    const sv = getWineCategorySv("lattdruckna-naturviner");
    const en = getWineCategoryEn("easy-drinking-natural-wine");
    expect(sv?.filter.tags).toEqual(["light_easy"]);
    expect(en?.filter.tags).toEqual(["light_easy"]);
    expect(sv?.hreflang).toBe("easy-drinking-natural-wine");
    expect(isWineCharacterShopCategory(sv!)).toBe(true);
    expect(isWineCharacterShopCategory(en!)).toBe(true);
  });

  it("uses editorial light_easy copy", () => {
    const sv = mergeWineCategoryContent(
      getWineCategorySv("lattdruckna-naturviner")!,
    );
    expect(sv.h1).toBe("Lättdruckna naturviner");
    expect(sv.title).toContain("Lättdruckna viner");
    expect(sv.description).toContain("glou glou");
    expect(sv.aboutText).toContain(
      "/guider/lattdruckna-naturviner-systembolaget",
    );

    const en = mergeWineCategoryContent(
      getWineCategoryEn("easy-drinking-natural-wine")!,
    );
    expect(en.h1).toBe("Easy-drinking natural wines");
    expect(en.aboutText).toBeUndefined();
  });

  it("promotes lone light_easy query and leaves other characters on the query", () => {
    expect(promoteShopCharacterQueryToPath("/vin?character=light_easy")).toBe(
      "/vin/lattdruckna-naturviner",
    );
    expect(
      promoteShopCharacterQueryToPath("/wine?character=light_easy"),
    ).toBe("/wine/easy-drinking-natural-wine");
    expect(
      promoteShopCharacterQueryToPath("/vin?character=fruit_forward"),
    ).toBe("/vin?character=fruit_forward");
    expect(
      promoteShopCharacterQueryToPath(
        "/vin?character=light_easy,fruit_forward",
      ),
    ).toBe("/vin?character=light_easy,fruit_forward");
    expect(
      promoteShopCharacterQueryToPath(
        "/vin/rott-naturvin?character=light_easy",
      ),
    ).toBe("/vin/rott-naturvin?character=light_easy");
  });

  it("navigates one path character to its PLP and combinations to the query", () => {
    expect(
      resolveCharacterFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin",
        search: "",
        nextValues: ["light_easy"],
      }),
    ).toBe("/vin/lattdruckna-naturviner");

    expect(
      resolveCharacterFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/lattdruckna-naturviner",
        search: "",
        nextValues: [],
      }),
    ).toBe("/vin");

    expect(
      resolveCharacterFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin/rott-naturvin",
        search: "",
        nextValues: ["light_easy"],
      }),
    ).toBe("/vin/rott-naturvin?character=light_easy");

    expect(
      resolveCharacterFilterNavigationUrl({
        locale: "sv",
        currentPath: "/vin",
        search: "",
        nextValues: ["fruit_forward"],
      }),
    ).toBe("/vin?character=fruit_forward");

    expect(
      finalizeShopFilterNavigationUrl(
        "/vin/rott-naturvin",
        "/vin/lattdruckna-naturviner",
        "",
      ),
    ).toBe("/vin/rott-naturvin?character=light_easy");

    expect(
      selectedWineCharacterValues("/vin/lattdruckna-naturviner", []),
    ).toEqual(["light_easy"]);
  });
});

describe("character index threshold", () => {
  it("omits character pages under the live-wine minimum from the sitemap", () => {
    const low = new Map([[WINE_CHARACTER_PATH_VALUE, 2]]);
    const high = new Map([[WINE_CHARACTER_PATH_VALUE, 30]]);
    expect(WINE_CHARACTER_INDEX_MIN_LIVE).toBe(3);
    expect(indexableWineCharacterPaths(low)).toEqual([]);
    expect(indexableWineCharacterPaths(high)).toEqual([
      {
        sv: "/vin/lattdruckna-naturviner",
        en: "/wine/easy-drinking-natural-wine",
      },
    ]);
  });

  it("noindexes character pages under the minimum and query combinations", () => {
    expect(
      categoryPageRobots("lattdruckna-naturviner", "sv", undefined, {
        characterBelowIndexMinimum: true,
      }),
    ).toEqual({ index: false, follow: true });
    expect(
      categoryPageRobots("lattdruckna-naturviner", "sv", undefined, {
        emptyListing: false,
        characterBelowIndexMinimum: false,
      }),
    ).toBeUndefined();
    expect(
      categoryPageRobots("lattdruckna-naturviner", "sv", {
        character: "fruit_forward",
      }),
    ).toEqual({ index: false, follow: true });
  });
});
