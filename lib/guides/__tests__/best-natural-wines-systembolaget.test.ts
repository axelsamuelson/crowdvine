import { describe, expect, it } from "vitest";

import { bestNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-systembolaget";
import { guideCopy } from "@/lib/guides/guide-copy";
import { publishedBilingualArticleGuides } from "@/lib/guides/guide-publication";
import { answerWithPriceRange } from "@/lib/guides/systembolaget-ranked-list";
import {
  SYSTEMBOLAGET_BEST_UPLINK,
  SYSTEMBOLAGET_BY_STYLE_HEADING,
  SYSTEMBOLAGET_RANKED_LISTS,
} from "@/lib/guides/systembolaget-list-links";
import { articlePath } from "@/lib/guides/guide-types";
import {
  pickPrimaryStyleCategory,
  primaryStyleLabel,
} from "@/lib/systembolaget/guide-wines";

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

describe("best natural wines at Systembolaget", () => {
  it("is the parent list and the first Systembolaget hub card", () => {
    expect(SYSTEMBOLAGET_RANKED_LISTS[0]?.category).toBe("best");
    expect(SYSTEMBOLAGET_RANKED_LISTS[0]?.href).toEqual({
      en: "/guides/best-natural-wines-systembolaget",
      sv: "/guider/basta-naturvinerna-pa-systembolaget",
    });
    expect(SYSTEMBOLAGET_RANKED_LISTS.filter((list) => list.category !== "best")).toHaveLength(7);

    for (const locale of ["sv", "en"] as const) {
      const section = guideCopy(locale).hubSections.find(
        (item) => item.title === "Systembolaget",
      );
      expect(section?.cards[0]?.href).toBe(
        articlePath(bestNaturalWinesSystembolagetArticle, locale),
      );
    }

    expect(publishedBilingualArticleGuides()).toContain(
      bestNaturalWinesSystembolagetArticle,
    );
  });

  it("uses the exact up-link line and style heading", () => {
    expect(
      `${SYSTEMBOLAGET_BEST_UPLINK.prefix.sv}${SYSTEMBOLAGET_BEST_UPLINK.anchor.sv}`,
    ).toBe("Se alla: Naturvin på Systembolaget: de bästa 2026");
    expect(
      `${SYSTEMBOLAGET_BEST_UPLINK.prefix.en}${SYSTEMBOLAGET_BEST_UPLINK.anchor.en}`,
    ).toBe("See all: Natural wine at Systembolaget: the best 2026");
    expect(SYSTEMBOLAGET_BY_STYLE_HEADING).toEqual({
      sv: "Efter färg och stil",
      en: "By colour and style",
    });
    const styleH1s = SYSTEMBOLAGET_RANKED_LISTS.filter(
      (list) => list.category !== "best",
    ).map((list) => list.h1.sv);
    expect(styleH1s).toEqual([
      "Bästa röda naturviner på Systembolaget 2026",
      "Bästa vita naturviner på Systembolaget 2026",
      "Bästa orange naturviner på Systembolaget 2026",
      "Bästa mousserande naturviner på Systembolaget",
      "Bästa rosé naturviner på Systembolaget",
      "Bästa naturvinerna under 200 kr på Systembolaget 2026",
      "Bästa glou-glou-vinerna på Systembolaget 2026",
    ]);
  });

  it("keeps the new title, h1 and meta within the length limits", () => {
    const article = bestNaturalWinesSystembolagetArticle;
    const svTitle = article.title.sv.replace(/\s*\|\s*PACT Wines\s*$/i, "");
    const enTitle = article.title.en.replace(/\s*\|\s*PACT Wines\s*$/i, "");
    expect(svTitle).toBe("Naturvin på Systembolaget 2026: de bästa");
    expect(enTitle).toBe("Natural wine at Systembolaget 2026: the best");
    expect(svTitle.length).toBeLessThanOrEqual(60);
    expect(enTitle.length).toBeLessThanOrEqual(60);
    expect(article.h1.sv).toBe("Naturvin på Systembolaget: de bästa 2026");
    expect(article.h1.en).toBe("Natural wine at Systembolaget: the best 2026");
    expect(article.meta.sv.length).toBeLessThanOrEqual(155);
    expect(article.meta.en.length).toBeLessThanOrEqual(155);
    expect(article.meta.sv).toContain("naturvin på Systembolaget");
    expect(article.meta.sv).toContain("Tio");
    expect(article.meta.sv).toContain("uppdateras löpande");
    expect(article.slug).toEqual({
      sv: "basta-naturvinerna-pa-systembolaget",
      en: "best-natural-wines-systembolaget",
    });

    const svLede = article.lede?.sv ?? "";
    expect(svLede.split("naturvin på Systembolaget").length - 1).toBe(1);
    expect(svLede.split("bästa naturvinerna på Systembolaget").length - 1).toBe(1);
    const enLede = article.lede?.en ?? "";
    expect(enLede.split("natural wine at Systembolaget").length - 1).toBe(1);
    expect(enLede.split("best natural wines at Systembolaget").length - 1).toBe(1);
  });

  it("has no em dashes and no Swedish letters in English copy", () => {
    const strings = collectStrings(bestNaturalWinesSystembolagetArticle);
    for (const text of strings) {
      expect(text).not.toMatch(/[—–]/);
    }

    const english = [
      bestNaturalWinesSystembolagetArticle.title.en,
      bestNaturalWinesSystembolagetArticle.meta.en,
      bestNaturalWinesSystembolagetArticle.h1.en,
      bestNaturalWinesSystembolagetArticle.lede?.en,
      ...(bestNaturalWinesSystembolagetArticle.sections.flatMap((section) => [
        section.heading?.en,
        ...(Array.isArray(section.body.en) ? section.body.en : [section.body.en]),
      ])),
      ...(bestNaturalWinesSystembolagetArticle.faqs ?? []).flatMap((faq) => [
        faq.question.en,
        faq.answer.en,
      ]),
      ...bestNaturalWinesSystembolagetArticle.internalLinks.map(
        (link) => link.label.en,
      ),
      SYSTEMBOLAGET_BEST_UPLINK.prefix.en,
      SYSTEMBOLAGET_BEST_UPLINK.anchor.en,
      SYSTEMBOLAGET_BY_STYLE_HEADING.en,
    ].filter((text): text is string => Boolean(text));

    for (const text of english) {
      expect(text).not.toMatch(/[åäöÅÄÖ]/);
    }
  });

  it("computes the price answer from rendered wines", () => {
    const template = bestNaturalWinesSystembolagetArticle.faqs?.[2]?.answer.en ?? "";
    expect(
      answerWithPriceRange(template, [{ price: 449 }, { price: 149 }], "en"),
    ).toBe("The wines on this list cost between 149 and 449 SEK.");
    expect(
      answerWithPriceRange(
        bestNaturalWinesSystembolagetArticle.faqs?.[2]?.answer.sv ?? "",
        [{ price: 200 }, { price: 361 }],
        "sv",
      ),
    ).toBe("Vinerna på den här listan kostar mellan 200 och 361 kr.");
    expect(answerWithPriceRange(template, [], "en")).toBe(
      "The price range appears when the list has wines.",
    );
    expect(answerWithPriceRange(template, [], "en")).not.toMatch(/\{min\}|\{max\}/);
  });

  it("labels the primary non-best style", () => {
    expect(pickPrimaryStyleCategory(["red"])).toBe("red");
    expect(pickPrimaryStyleCategory(["budget"])).toBe("budget");
    expect(pickPrimaryStyleCategory(["glouglou", "orange"])).toBe("orange");
    expect(pickPrimaryStyleCategory(["glouglou"])).toBeNull();
    expect(primaryStyleLabel("rose", "sv")).toBe("Rosé");
    expect(primaryStyleLabel("rose", "en")).toBe("Rosé");
    expect(primaryStyleLabel("sparkling", "en")).toBe("Sparkling");
    expect(primaryStyleLabel("white", "sv")).toBe("Vitt");
    expect(primaryStyleLabel("glouglou", "en")).toBeNull();
  });
});
