import { describe, expect, it } from "vitest";

import {
  categoryPageRobots,
  isThinDynamicGrapeCategory,
} from "@/lib/seo/noindex-robots";
import { buildDynamicGrapeCategory } from "@/lib/wine-grape-categories";
import type { WineCategory } from "@/lib/wine-category-types";

describe("thin dynamic grape indexing", () => {
  it("flags generated grape PLPs without editorial longDescription", () => {
    const thin = buildDynamicGrapeCategory("Macabeu", "sv");
    expect(isThinDynamicGrapeCategory(thin)).toBe(true);
    expect(
      categoryPageRobots(thin.slug, "sv", undefined, {
        thinDynamicGrape: true,
      }),
    ).toEqual({ index: false, follow: true });
  });

  it("does not flag grape PLPs that have editorial copy", () => {
    const editorial: WineCategory = {
      ...buildDynamicGrapeCategory("Carignan", "en"),
      longDescription: "Carignan from old vines in Languedoc.",
    };
    expect(isThinDynamicGrapeCategory(editorial)).toBe(false);
  });
});
