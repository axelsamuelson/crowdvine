import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bestOrangeNaturalWinesSystembolagetArticle,
  bestOrangeNaturalWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import {
  editorialReviewedDate,
  linkNamedWines,
  wineAnchorId,
  wineFactRows,
} from "@/lib/guides/systembolaget-ranked-list";
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
    expect(serialized).toContain(
      "Systembolagets data visar inte tillsatser eller sulfithalt för de här vinerna, så vi anger dem inte.",
    );
    const howWeChoose = bestOrangeNaturalWinesSystembolagetArticle.sections.find(
      (section) => section.heading?.en === "How we choose",
    );
    const howEn = Array.isArray(howWeChoose?.body.en)
      ? howWeChoose.body.en.join("\n")
      : (howWeChoose?.body.en ?? "");
    expect(howEn).toBe(
      "Most Systembolaget lists of [orange wine](/wine/orange-natural-wine) are written by importers or shops that profit from what you buy. We don't — PACT is not sold at Systembolaget. No affiliate links.\nA wine must have organic or biodynamic farming, spontaneous fermentation, meaningful skin contact on white grapes, minimal or no added sulphur (around 30 mg/l added), and a producer with a recognised reputation — not just a certificate. Updated against live assortment data.",
    );
    expect(howEn).not.toContain("PACT imports from Languedoc");
    expect(howEn).toContain("PACT is not sold at Systembolaget");
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
      id: 1,
      producer_name: "Radikon",
      name_bold: "Ribolla",
      name_thin: null,
      origin_level_1: "Friuli",
      country: "Italien",
      vintage: 2019,
      grapes: ["Ribolla Gialla"],
      alcohol_percentage: 12,
      volume: 500,
      assortment_text: "Ordervaror",
      is_organic: true,
    } as SystembolagetGuideWine;
    expect(wineFactRows(wine, "sv").map((row) => [row.term, row.description])).toEqual([
      ["Region", "Friuli, Italien"],
      ["Årgång", "2019"],
      ["Druva", "Ribolla Gialla"],
      ["Alkohol", "12 %"],
      ["Sortiment", "beställningsvara"],
      ["Odling", "ekologisk (enligt Systembolaget)"],
    ]);
    expect(
      wineFactRows(
        { ...wine, is_organic: false, vintage: null, origin_level_1: null, country: null },
        "sv",
      ).map((row) => row.term),
    ).toEqual(["Druva", "Alkohol", "Sortiment"]);
  });

  it("anchors a ranked wine from its name and links only names on the list", () => {
    const radikon = {
      id: 1,
      product_number: "1",
      producer_name: "Radikon",
      name_bold: "Ribolla",
      name_thin: null,
    } as SystembolagetGuideWine;
    const faller = {
      id: 2,
      product_number: "2",
      producer_name: "Luc Faller",
      name_bold: "Macerat",
      name_thin: "Pinot Gris",
    } as SystembolagetGuideWine;
    expect(wineAnchorId(radikon)).toBe("radikon-ribolla");
    expect(wineAnchorId(faller)).toBe("luc-faller-macerat-pinot-gris");
    const linked = linkNamedWines(
      "Luc Faller Macerat, Binner Bombisch och Radikon Ribolla.",
      [radikon, faller],
    );
    expect(linked).toBe(
      "[Luc Faller Macerat](#luc-faller-macerat-pinot-gris), Binner Bombisch och [Radikon Ribolla](#radikon-ribolla).",
    );
  });

  it("sets Senast granskad from the article date and last_reviewed_at only", () => {
    expect(
      editorialReviewedDate("2026-11-01", [
        { last_reviewed_at: "2026-10-01" },
        { last_reviewed_at: "2026-11-04T08:00:00Z" },
      ]),
    ).toBe("2026-11-04T08:00:00Z");
    expect(
      editorialReviewedDate("2026-11-05", [
        { last_reviewed_at: "2026-11-02T04:00:42.381+00:00" },
      ]),
    ).toBe("2026-11-05");
  });
});
