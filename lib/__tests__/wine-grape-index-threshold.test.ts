import { describe, expect, it } from "vitest";

import type { WineCategory } from "@/lib/wine-category-types";
import {
  DYNAMIC_GRAPE_INDEX_MIN_WINES,
  buildDynamicGrapeCategory,
  grapeCategoryIndexMinWines,
  isThinDynamicGrapeCategory,
} from "@/lib/wine-grape-categories";

describe("dynamic grape index threshold", () => {
  it("requires at least three wines for thin dynamic grape PLPs", () => {
    expect(DYNAMIC_GRAPE_INDEX_MIN_WINES).toBe(3);
    const thin = buildDynamicGrapeCategory("Macabeu", "sv");
    expect(isThinDynamicGrapeCategory(thin)).toBe(true);
    expect(grapeCategoryIndexMinWines(thin)).toBe(3);
  });

  it("keeps editorial grape PLPs indexable from one wine", () => {
    const editorial: WineCategory = {
      ...buildDynamicGrapeCategory("Carignan", "en"),
      longDescription: "Carignan thrives on old vines in Languedoc.",
    };
    expect(isThinDynamicGrapeCategory(editorial)).toBe(false);
    expect(grapeCategoryIndexMinWines(editorial)).toBe(1);
  });
});
