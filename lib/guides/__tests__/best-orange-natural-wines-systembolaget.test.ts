import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bestOrangeNaturalWinesSystembolagetArticle,
  bestOrangeNaturalWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { wineFactRows } from "@/lib/guides/systembolaget-ranked-list";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import type { SystembolagetGuideWine } from "@/lib/systembolaget/guide-wines";

describe("best orange natural wines Systembolaget guide", () => {
  it("keeps the Swedish URL and English hreflang pair", () => {
    expect(articlePath(bestOrangeNaturalWinesSystembolagetSvArticle, "sv")).toBe(
      "/guider/basta-orange-naturviner-systembolaget",
    );
    expect(articlePath(bestOrangeNaturalWinesSystembolagetArticle, "en")).toBe(
      "/guides/best-orange-natural-wines-systembolaget",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.slug).toEqual(
      bestOrangeNaturalWinesSystembolagetArticle.slug,
    );
  });

  it("uses the restored Swedish H1 and the title without a doubled brand suffix", () => {
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.h1.sv).toBe(
      "Bästa orange vin på Systembolaget 2026",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.meta.sv).toBe(
      "Bästa orange vin på Systembolaget enligt PACT: vårt urval med äkta skalkontakt, fakta om druva och producent samt vanliga frågor.",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.title.sv).toBe(
      "Bästa orange vin på Systembolaget – vårt urval | PACT",
    );
    // Layout title.template adds " | PACT Wines"; strip brand suffix to avoid doubling.
    expect(
      categoryPageTitle(
        bestOrangeNaturalWinesSystembolagetSvArticle.title.sv,
        "PACT Wines",
      ),
    ).toBe("Bästa orange vin på Systembolaget – vårt urval");
  });

  it("credits Axel Samuelson with Person-ready author fields and FAQ schema source", () => {
    const author = bestOrangeNaturalWinesSystembolagetSvArticle.author;
    expect(author?.name).toBe("Axel Samuelson");
    expect(author?.jobTitle).toBe("Grundare av PACT");
    expect(author?.byline.sv).toContain("grundare av PACT");
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.faqs?.length).toBeGreaterThanOrEqual(
      6,
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.shopCta).toBeNull();
  });

  it("keeps the editorial sections and drops the hardcoded wine list", () => {
    const headings = bestOrangeNaturalWinesSystembolagetSvArticle.sections.map(
      (section) => section.heading?.sv,
    );
    expect(headings).toEqual([
      "Vårt urval i korthet",
      "Så har vi valt",
      "Vad vi inte listar",
      "Vad är orange vin?",
      "Orange vin och mat",
    ]);
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.lede?.sv).toContain(
      "Listan är oberoende. PACT säljer inte på Systembolaget och tjänar ingenting på vad du väljer.",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.lede?.sv).not.toContain(
      "Vi visar inga priser",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.lede?.sv).not.toContain(
      "Languedoc",
    );
    const avoid = bestOrangeNaturalWinesSystembolagetSvArticle.sections.find(
      (section) => section.heading?.en === "What we don't list",
    );
    const avoidSv = Array.isArray(avoid?.body.sv)
      ? avoid.body.sv.join("\n")
      : (avoid?.body.sv ?? "");
    expect(avoidSv).toContain("Nanit Orange");
    expect(avoidSv).toContain("Petite Orange");
    expect(avoidSv).toContain("Côté Mas");
    expect(avoidSv).toContain("Santa Julia");

    const serialized = JSON.stringify(bestOrangeNaturalWinesSystembolagetSvArticle);
    expect(serialized).not.toContain("Fler från Radikon");
    expect(serialized).not.toContain("Också värt att känna till");
    expect(serialized).not.toContain("Vi visar inga priser");
    expect(serialized).toContain("Inte alla viner på listan är naturvin");
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.showRankedWineFacts).toBe(
      true,
    );
    expect(bestOrangeNaturalWinesSystembolagetArticle.showRankedWineFacts).toBeUndefined();
    expect(bestOrangeNaturalWinesSystembolagetArticle.h1.en).toBe(
      "Best orange natural wines at Systembolaget 2026",
    );

    const page = readFileSync(
      "app/guider/basta-orange-naturviner-systembolaget/page.tsx",
      "utf8",
    );
    expect(page).toContain('renderSystembolagetRankedListPage');
    expect(page).toContain('"orange"');
    expect(page).not.toContain("renderArticleGuidePage");
    const english = readFileSync(
      "app/guides/best-orange-natural-wines-systembolaget/page.tsx",
      "utf8",
    );
    expect(english).toContain("bestOrangeNaturalWinesSystembolagetArticle");
    expect(english).not.toContain("bestOrangeNaturalWinesSystembolagetSvArticle");
  });

  it("builds per-wine facts from database fields and omits farming when not organic", () => {
    const wine = {
      producer_name: "Radikon",
      origin_level_1: "Friuli",
      country: "Italien",
      grapes: ["Ribolla Gialla"],
      alcohol_percentage: 12,
      volume: 500,
      assortment_text: "Ordervaror",
      is_organic: true,
    } as SystembolagetGuideWine;
    expect(wineFactRows(wine, "sv").map((row) => row.term)).toEqual([
      "Producent och region",
      "Druva",
      "Alkohol",
      "Sortiment",
      "Odling",
    ]);
    expect(wineFactRows(wine, "sv")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          term: "Odling",
          description: "ekologisk (enligt Systembolaget)",
        }),
        expect.objectContaining({
          term: "Sortiment",
          description: "beställningsvara",
        }),
      ]),
    );
    expect(
      wineFactRows({ ...wine, is_organic: false }, "sv").some(
        (row) => row.term === "Odling",
      ),
    ).toBe(false);
  });
});
