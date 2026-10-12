import { describe, expect, it } from "vitest";

import { buyNaturalWineOnlineSwedenArticle } from "@/lib/guides/articles/buy-natural-wine-online-sweden";
import { BILINGUAL_ARTICLE_GUIDES } from "@/lib/guides/bilingual-article-guides";
import { guideCopy } from "@/lib/guides/guide-copy";
import {
  isIndexableGuideHref,
  publishedBilingualArticleGuides,
} from "@/lib/guides/guide-publication";
import {
  articlePath,
  isGuideArticlePublished,
} from "@/lib/guides/guide-types";
import { publicSystembolagetRankedLists } from "@/lib/guides/systembolaget-list-links";

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

describe("buy natural wine online article", () => {
  it("is published and included in the registry", () => {
    expect(buyNaturalWineOnlineSwedenArticle.published).toBe(true);
    expect(isGuideArticlePublished(buyNaturalWineOnlineSwedenArticle)).toBe(
      true,
    );
    expect(BILINGUAL_ARTICLE_GUIDES).toContain(
      buyNaturalWineOnlineSwedenArticle,
    );
    expect(publishedBilingualArticleGuides()).toContain(
      buyNaturalWineOnlineSwedenArticle,
    );
  });

  it("is on the hub and allowed as an inbound link", () => {
    const svHref = articlePath(buyNaturalWineOnlineSwedenArticle, "sv");
    const enHref = articlePath(buyNaturalWineOnlineSwedenArticle, "en");
    expect(svHref).toBe("/guider/kopa-naturvin-online");
    expect(enHref).toBe("/guides/buy-natural-wine-online-sweden");
    expect(isIndexableGuideHref(svHref)).toBe(true);
    expect(isIndexableGuideHref(enHref)).toBe(true);

    for (const locale of ["sv", "en"] as const) {
      const hrefs = guideCopy(locale).hubCards.map((card) => card.href);
      expect(hrefs).toContain(locale === "sv" ? svHref : enHref);
    }
  });

  it("has no shop CTA and no PACT shop paths", () => {
    expect(buyNaturalWineOnlineSwedenArticle.shopCta).toBeNull();
    const hrefs = [
      ...buyNaturalWineOnlineSwedenArticle.internalLinks.flatMap((link) => [
        link.href.en,
        link.href.sv,
      ]),
    ];
    expect(hrefs.some((href) => href === "/vin" || href.startsWith("/vin/"))).toBe(
      false,
    );
    expect(
      hrefs.some((href) => href === "/wine" || href.startsWith("/wine/")),
    ).toBe(false);
  });

  it("places Vin & Natur after Systembolaget and includes Cave Pur Jus", () => {
    expect(buyNaturalWineOnlineSwedenArticle.includePurJus).toBe(true);
    const headings = buyNaturalWineOnlineSwedenArticle.sections.map(
      (section) => section.heading?.en,
    );
    expect(headings).toEqual([
      "Is it legal?",
      "Systembolaget online",
      "Vin & Natur",
      "Vinoteket",
      "Winefinder",
      "MORE Natural Wine (Berlin)",
      "Cave Pur Jus (France)",
      "How to check a shop",
      "How we reviewed",
      "Sources",
    ]);
    const strings = collectStrings(buyNaturalWineOnlineSwedenArticle);
    expect(strings.some((text) => text.includes("https://www.cavepurjus.com"))).toBe(
      true,
    );
    expect(
      strings.some((text) => text.includes("https://vinnatur.shop/pages/frakt")),
    ).toBe(true);
    expect(
      strings.some((text) =>
        text.includes("https://vinnatur.shop/pages/om-vin-natur"),
      ),
    ).toBe(true);
  });

  it("links every Systembolaget ranked list in further reading", () => {
    const hrefs = new Set(
      buyNaturalWineOnlineSwedenArticle.internalLinks.map(
        (link) => link.href.en,
      ),
    );
    for (const list of publicSystembolagetRankedLists()) {
      expect(hrefs.has(list.href.en)).toBe(true);
    }
    expect(hrefs.has("/guides/best-pet-nat-systembolaget")).toBe(true);
  });

  it("has no em dashes in copy", () => {
    const strings = collectStrings(buyNaturalWineOnlineSwedenArticle);
    for (const text of strings) {
      expect(text).not.toMatch(/[—–]/);
    }
  });

  it("keeps Swedish letters out of English copy except Malmö", () => {
    const article = buyNaturalWineOnlineSwedenArticle;
    const english = [
      article.title.en,
      article.meta.en,
      article.h1.en,
      article.lede?.en,
      article.breadcrumbShort.en,
      article.hubCard.title.en,
      article.hubCard.description.en,
      ...article.sections.flatMap((section) => [
        section.heading?.en,
        ...(Array.isArray(section.body.en)
          ? section.body.en
          : [section.body.en]),
        ...(section.blocks ?? []).flatMap((block) =>
          block.type === "paragraphs"
            ? Array.isArray(block.body.en)
              ? block.body.en
              : [block.body.en]
            : [block.label?.en, ...block.items.en],
        ),
      ]),
      ...article.internalLinks.map((link) => link.label.en),
    ].filter((text): text is string => Boolean(text));

    for (const text of english) {
      const withoutMalmo = text.replaceAll("Malmö", "");
      expect(withoutMalmo).not.toMatch(/[åäöÅÄÖ]/);
    }
  });
});
