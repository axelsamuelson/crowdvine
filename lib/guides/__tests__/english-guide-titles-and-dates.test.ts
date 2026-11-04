import { describe, expect, it } from "vitest";

import { beaujolaisNaturalWineArticle } from "@/lib/guides/articles/beaujolais-natural-wine";
import { gangOfFourWineArticle } from "@/lib/guides/articles/gang-of-four-wine";
import { jeanFoillardArticle } from "@/lib/guides/articles/jean-foillard";
import { juraNaturalWineArticle } from "@/lib/guides/articles/jura-natural-wine";
import { radikonArticle } from "@/lib/guides/articles/radikon";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import { publishedBilingualArticleGuides } from "@/lib/guides/guide-publication";
import type { GuideArticleContent } from "@/lib/guides/guide-types";
import { worldsBestNaturalChampagneGuide } from "@/lib/guides/worlds-best-natural-champagne";
import { worldsBestOrangeWinesGuide } from "@/lib/guides/worlds-best-orange-wines";

const SITE = "https://pactwines.com";

function absoluteTitle(article: GuideArticleContent) {
  return buildArticleGuideMeta(article, "en", SITE, "PACT Wines").title;
}

describe("English guide titles", () => {
  it("renders the four retitled guides without a site-name suffix", () => {
    expect(gangOfFourWineArticle.h1.en).toBe(
      "The Gang of Four: the producers who saved Beaujolais",
    );
    expect(absoluteTitle(gangOfFourWineArticle)).toEqual({
      absolute: "The Gang of Four: Foillard, Lapierre, Thévenet and Breton",
    });
    expect(gangOfFourWineArticle.meta.en).toBe(
      "The four Morgon growers who saved Beaujolais in the 1980s: Jean Foillard, Marcel Lapierre, Jean-Paul Thévenet and Guy Breton. Who they were and what changed.",
    );

    expect(jeanFoillardArticle.h1.en).toBe("Jean Foillard");
    expect(absoluteTitle(jeanFoillardArticle)).toEqual({
      absolute: "Jean Foillard: Morgon, Côte du Py and the Wines",
    });

    expect(beaujolaisNaturalWineArticle.h1.en).toBe("Beaujolais natural wine");
    expect(absoluteTitle(beaujolaisNaturalWineArticle)).toEqual({
      absolute:
        "Beaujolais Natural Wine: Gamay, the Ten Crus and the Producers",
    });

    expect(juraNaturalWineArticle.h1.en).toBe(
      "Jura wine: the complete guide to natural wine from the Jura",
    );
    expect(absoluteTitle(juraNaturalWineArticle)).toEqual({
      absolute: "Jura Wine: Natural Wine, Vin Jaune and the Producers",
    });

    expect(gangOfFourWineArticle.title.sv).toBe(
      "Gang of Four — som räddade Beaujolais",
    );
    expect(jeanFoillardArticle.h1.sv).toContain("Gang of Four");
    expect(beaujolaisNaturalWineArticle.title.sv).toBe(
      "Beaujolais naturvin — regional guide",
    );
    expect(juraNaturalWineArticle.h1.sv).toBe(
      "Jura naturvin — den kompletta guiden",
    );
  });

  it("drops the English Radikon Systembolaget link and keeps the Swedish one", () => {
    const link = radikonArticle.internalLinks.find((item) =>
      item.href.sv.includes("basta-orange-naturviner-systembolaget"),
    );
    expect(link?.label.en.trim()).toBe("");
    expect(link?.label.sv).toBe(
      "Bästa orange naturviner på Systembolaget →",
    );
  });
});

describe("guide article dates", () => {
  it("gives every published article an updated date for dateModified", () => {
    for (const article of publishedBilingualArticleGuides()) {
      expect(article.updated, article.slug.en).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(worldsBestOrangeWinesGuide.updated).toBe("2026-10-25");
    expect(worldsBestNaturalChampagneGuide.updated).toBe("2026-10-25");
  });
});
