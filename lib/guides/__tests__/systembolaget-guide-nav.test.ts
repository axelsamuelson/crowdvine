import { describe, expect, it } from "vitest";

import { newNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import {
  SYSTEMBOLAGET_GUIDE_NAV_LABEL,
  SYSTEMBOLAGET_RANKED_LISTS,
  systembolagetGuideNavItems,
} from "@/lib/guides/systembolaget-list-links";

describe("Systembolaget guide switcher", () => {
  it("lists overview guides first, then colour and style, with short labels", () => {
    const items = systembolagetGuideNavItems("sv");
    expect(items.map((item) => item.category)).toEqual([
      "best",
      "new",
      "red",
      "white",
      "orange",
      "sparkling",
      "rose",
      "budget",
      "glouglou",
      "petnat",
    ]);
    expect(items.map((item) => item.short)).toEqual([
      "Bästa",
      "Nya",
      "Röda",
      "Vita",
      "Orange",
      "Mousserande",
      "Rosé",
      "Under 200 kr",
      "Glou-glou",
      "Pet nat",
    ]);
    expect(SYSTEMBOLAGET_GUIDE_NAV_LABEL.sv).toBe("Systembolaget-guider");
  });

  it("uses the ranked-list paths and the release guide for Nya", () => {
    const sv = systembolagetGuideNavItems("sv");
    const en = systembolagetGuideNavItems("en");

    expect(sv.find((item) => item.category === "best")?.href).toBe(
      "/guider/basta-naturvinerna-pa-systembolaget",
    );
    expect(sv.find((item) => item.category === "new")?.href).toBe(
      articlePath(newNaturalWinesSystembolagetArticle, "sv"),
    );
    expect(en.find((item) => item.category === "new")?.href).toBe(
      "/guides/new-natural-wines-systembolaget",
    );
    expect(en.map((item) => item.short)).toEqual([
      "Best",
      "New",
      "Red",
      "White",
      "Orange",
      "Sparkling",
      "Rosé",
      "Under 200",
      "Glou-glou",
      "Pet nat",
    ]);

    for (const list of SYSTEMBOLAGET_RANKED_LISTS) {
      expect(sv.find((item) => item.category === list.category)?.name).toBe(
        list.h1.sv,
      );
      expect(en.find((item) => item.category === list.category)?.href).toBe(
        list.href.en,
      );
    }
  });

  it("keeps English chip labels free of Swedish letters and dashes", () => {
    const labels = [
      SYSTEMBOLAGET_GUIDE_NAV_LABEL.en,
      ...systembolagetGuideNavItems("en").flatMap((item) => [
        item.short,
        item.name,
      ]),
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/[åäöÅÄÖ—–]/);
    }
  });
});
