import { describe, expect, it } from "vitest";

import { bestPetNatWinesSystembolagetArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { buyNaturalWineOnlineSwedenArticle } from "@/lib/guides/articles/buy-natural-wine-online-sweden";
import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import { guideCopy } from "@/lib/guides/guide-copy";
import {
  isIndexableGuideHref,
  publishedBilingualArticleGuides,
} from "@/lib/guides/guide-publication";
import { articlePath } from "@/lib/guides/guide-types";
import {
  publicSystembolagetRankedLists,
  siblingSystembolagetLists,
  SYSTEMBOLAGET_RANKED_LISTS,
} from "@/lib/guides/systembolaget-list-links";

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

const PUBLISHED_PATHS = [
  "/guider/basta-pet-nat-systembolaget",
  "/guides/best-pet-nat-systembolaget",
  "/guider/vad-ar-pet-nat",
  "/guides/what-is-pet-nat",
];

describe("pet nat Systembolaget guides", () => {
  it("publishes both guides into the hub, sitemap set and live lists", () => {
    expect(bestPetNatWinesSystembolagetArticle.published).toBe(true);
    expect(whatIsPetNatArticle.published).toBe(true);
    expect(publishedBilingualArticleGuides()).toContain(
      bestPetNatWinesSystembolagetArticle,
    );
    expect(publishedBilingualArticleGuides()).toContain(whatIsPetNatArticle);

    for (const path of PUBLISHED_PATHS) {
      expect(isIndexableGuideHref(path)).toBe(true);
    }

    for (const locale of ["sv", "en"] as const) {
      const hrefs = guideCopy(locale).hubCards.map((card) => card.href);
      expect(hrefs).toContain(articlePath(bestPetNatWinesSystembolagetArticle, locale));
      expect(hrefs).toContain(articlePath(whatIsPetNatArticle, locale));
    }

    const publicCategories = publicSystembolagetRankedLists().map(
      (list) => list.category,
    );
    expect(publicCategories).toContain("petnat");
    expect(
      SYSTEMBOLAGET_RANKED_LISTS.some((list) => list.category === "petnat"),
    ).toBe(true);

    const sparklingSiblings = siblingSystembolagetLists("sparkling").map(
      (list) => list.category,
    );
    expect(sparklingSiblings).toContain("petnat");
    expect(sparklingSiblings).toContain("glouglou");
    expect(siblingSystembolagetLists("petnat").map((list) => list.category)).toEqual(
      expect.arrayContaining(["best", "sparkling", "glouglou"]),
    );
  });

  it("uses the requested Swedish title, h1 and meta", () => {
    const article = bestPetNatWinesSystembolagetArticle;
    const svTitle = article.title.sv.replace(/\s*\|\s*PACT Wines\s*$/i, "");
    expect(svTitle).toBe("Pet nat på Systembolaget 2026: de bästa");
    expect(article.h1.sv).toBe("Bästa pet nat på Systembolaget 2026");
    expect(article.meta.sv.length).toBeLessThanOrEqual(155);
    expect(article.meta.en.length).toBeLessThanOrEqual(155);
    expect(article.meta.sv).toContain("pet nat");
    expect(article.meta.sv).toContain("Systembolaget");
    expect(article.meta.sv).toContain("uppdateras löpande");
    expect(article.slug).toEqual({
      sv: "basta-pet-nat-systembolaget",
      en: "best-pet-nat-systembolaget",
    });
    expect(article.lede?.sv.toLowerCase()).toContain("pet nat på systembolaget");
    expect(article.lede?.sv).toContain("pet nat");
    expect(article.faqs).toHaveLength(3);
    expect(article.sections[0]?.heading.sv).toBe("Vad är pet nat?");
    expect(article.sections[0]?.body.sv[0]).toContain("/guider/vad-ar-pet-nat");
  });

  it("keeps the explainer answer first and the requested sections", () => {
    const article = whatIsPetNatArticle;
    const svTitle = article.title.sv.replace(/\s*\|\s*PACT Wines\s*$/i, "");
    expect(svTitle).toBe("Vad är pet nat? Så görs pétillant naturel");
    expect(article.h1.sv).toBe("Vad är pet nat?");
    expect(article.lede?.sv.split(/(?<=\.)\s+/).length).toBeGreaterThanOrEqual(2);
    expect(article.lede?.sv.split(/(?<=\.)\s+/).length).toBeLessThanOrEqual(3);
    expect(article.meta.sv.length).toBeLessThanOrEqual(155);
    expect(article.meta.en.length).toBeLessThanOrEqual(155);
    expect(article.sections.map((section) => section.heading?.sv)).toEqual([
      "Vad det betyder",
      "Hur det görs",
      "Skillnad mot champagne och cava",
      "Så serverar du",
      "Vad du ska titta efter",
    ]);
    expect(article.faqs).toHaveLength(3);
    const hrefs = article.internalLinks.map((link) => link.href.sv);
    expect(hrefs).toEqual([
      "/guider/basta-pet-nat-systembolaget",
      "/guider/basta-mousserande-naturviner-systembolaget",
      "/guider/vad-ar-naturvin",
      "/guider/basta-naturvinerna-pa-systembolaget",
    ]);
  });

  it("has no em dashes and no Swedish letters in English copy", () => {
    for (const article of [
      bestPetNatWinesSystembolagetArticle,
      whatIsPetNatArticle,
    ]) {
      for (const text of collectStrings(article)) {
        expect(text).not.toMatch(/[—–]/);
      }
      const english = [
        article.title.en,
        article.meta.en,
        article.h1.en,
        article.lede?.en,
        ...article.sections.flatMap((section) => [
          section.heading?.en,
          ...(Array.isArray(section.body.en) ? section.body.en : [section.body.en]),
        ]),
        ...(article.faqs ?? []).flatMap((faq) => [faq.question.en, faq.answer.en]),
        ...article.internalLinks.map((link) => link.label.en),
      ].filter((text): text is string => Boolean(text));
      for (const text of english) {
        expect(text).not.toMatch(/[åäöÅÄÖ]/);
      }
    }
  });

  it("links the published list from the buying guide", () => {
    const strings = collectStrings(buyNaturalWineOnlineSwedenArticle);
    expect(strings.some((text) => text.includes("/guides/best-pet-nat-systembolaget"))).toBe(
      true,
    );
    expect(strings.some((text) => text.includes("/guider/basta-pet-nat-systembolaget"))).toBe(
      true,
    );
  });
});
