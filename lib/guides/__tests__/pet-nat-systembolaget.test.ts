import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/guider/vad-ar-pet-nat",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import {
  bestPetNatWinesSystembolagetArticle,
  bestPetNatWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { buyNaturalWineOnlineSwedenArticle } from "@/lib/guides/articles/buy-natural-wine-online-sweden";
import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { renderArticleRichText } from "@/lib/guides/article-guide-shell";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import { renderArticleGuidePage } from "@/lib/guides/render-article-guide";
import { buildSystembolagetRankedListMetadata } from "@/lib/guides/systembolaget-ranked-list";
import { articleUpdatedOn, articleVisibleForLocale } from "@/lib/guides/guide-types";
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
    const svTitle = article.title.sv
      .replace(/\s*\|\s*PACT Wines\s*$/i, "")
      .replace(/\s*\|\s*PACT\s*$/i, "");
    expect(svTitle).toBe("Bästa pet nat på Systembolaget – vårt urval");
    expect(svTitle.length).toBeLessThanOrEqual(60);
    expect(article.h1.sv).toBe("Bästa pet nat på Systembolaget");
    // Draft meta is intentionally longer than the old 155 limit.
    expect(article.meta.sv.length).toBeLessThanOrEqual(170);
    expect(article.meta.en.length).toBeLessThanOrEqual(155);
    expect(article.meta.sv).toContain("pet nat");
    expect(article.meta.sv).toContain("Systembolaget");
    expect(article.meta.sv).toContain("pét-nat");
    expect(article.slug).toEqual({
      sv: "basta-pet-nat-systembolaget",
      en: "best-pet-nat-systembolaget",
    });
    expect(article.lede?.sv.toLowerCase()).toContain("pet nat på systembolaget");
    expect(article.lede?.sv).toContain("pet nat");
    expect(article.faqs).toHaveLength(3);
    expect(article.author?.name).toBe("Axel Samuelson");
    expect(article.shopCta).toBeNull();
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
    expect(article.meta.sv).toBe(
      "Pet nat är mousserande vin som buteljeras innan jäsningen är klar, så att bubblorna bildas i flaskan. Så görs det, skillnaden mot champagne och prosecco, och hur du öppnar flaskan.",
    );
    expect(
      articleVisibleForLocale(article.sections, "sv").map(
        (section) => section.heading?.sv,
      ),
    ).toEqual([
      undefined,
      "Vad betyder pétillant naturel?",
      "Hur pet nat görs",
      "Skillnad mot champagne och cava",
      "Skillnad mot prosecco",
      "Var pet nat kommer ifrån",
      "Stilar",
      "Hur smakar pet nat?",
      "Så serverar du",
      "Vad du ska titta efter",
    ]);
    expect(
      articleVisibleForLocale(article.faqs ?? [], "sv").map(
        (faq) => faq.question.sv,
      ),
    ).toEqual([
      "Vad är pet nat?",
      "Är pet nat samma sak som champagne?",
      "Är pet nat alltid naturvin?",
      "Är pet nat alltid torrt?",
      "Varför är vinet grumligt?",
      "Hur öppnar man en pet nat?",
    ]);
    const swedish = [
      article.meta.sv,
      article.lede?.sv ?? "",
      ...articleVisibleForLocale(article.sections, "sv").flatMap((section) => [
        section.heading?.sv ?? "",
        ...(Array.isArray(section.body.sv) ? section.body.sv : [section.body.sv]),
      ]),
      ...articleVisibleForLocale(article.faqs ?? [], "sv").flatMap((faq) => [
        faq.question.sv,
        faq.answer.sv,
      ]),
    ].join("\n");
    expect(swedish).not.toMatch(/[—–]/);
    expect(swedish).toContain(
      "[Vad är orange vin?](/guider/vad-ar-orange-vin)",
    );
    const hrefs = article.internalLinks
      .filter((link) => link.label.sv.trim().length > 0)
      .map((link) => link.href.sv);
    expect(hrefs).toEqual([
      "/guider/basta-mousserande-naturviner-systembolaget",
      "/guider/vad-ar-naturvin",
      "/guider/basta-naturvinerna-pa-systembolaget",
      "/vin/pet-nat",
    ]);
    const lookFor = article.sections.find(
      (section) => section.heading?.sv === "Vad du ska titta efter",
    );
    const lookForSv = Array.isArray(lookFor?.body.sv)
      ? lookFor.body.sv.join("\n")
      : (lookFor?.body.sv ?? "");
    expect(lookForSv).toContain(
      "[pet nat på Systembolaget](/guider/basta-pet-nat-systembolaget)",
    );
    expect(lookForSv.match(/\/guider\/basta-pet-nat-systembolaget/g)).toHaveLength(
      1,
    );
    expect(lookForSv).not.toContain("/vin/pet-nat");
    expect(
      article.internalLinks.find((link) => link.href.sv === "/vin/pet-nat")?.label
        .sv,
    ).toBe("Pet nat att köpa →");
  });

  it("replaces the English explainer and keeps Systembolaget links off that page", () => {
    const article = whatIsPetNatArticle;
    const title = "What Is Pet Nat? Pétillant Naturel Wine Explained";
    expect(article.title.en).toBe(title);
    expect(article.h1.en).toBe("What is pet nat?");
    expect(article.absoluteTitle).toEqual({ en: true });
    expect(article.updated).toBe("2026-11-07");
    expect(article.hubCard.description.en).toBe(
      "What pétillant naturel means, how it is made, and how it differs from Champagne and Prosecco.",
    );
    expect(
      buildArticleGuideMeta(article, "en", "https://pactwines.com", "PACT Wines")
        .title,
    ).toEqual({ absolute: title });
    expect(
      articleVisibleForLocale(article.sections, "en").map(
        (section) => section.heading?.en ?? "",
      ),
    ).toEqual([
      "",
      "What does pétillant naturel mean?",
      "How pet nat is made",
      "Pet nat vs Champagne",
      "Pet nat vs Prosecco",
      "Where pet nat comes from",
      "Pet nat styles",
      "What does pet nat taste like?",
      "How to open and serve pet nat",
      "How to find a good pet nat",
    ]);
    const en = articleVisibleForLocale(article.sections, "en")
      .flatMap((section) =>
        Array.isArray(section.body.en) ? section.body.en : [section.body.en],
      )
      .join("\n");
    expect(en).toContain("43–50°F (6–10°C)");
    expect(en).toContain("Christian Chaussard");
    expect(en).toContain("[What is orange wine?](/guides/what-is-orange-wine)");
    expect(en).not.toContain("Systembolaget");
    expect(
      articleVisibleForLocale(article.faqs ?? [], "en").map(
        (faq) => faq.question.en,
      ),
    ).toEqual([
      "What is pet nat?",
      "Is pet nat the same as Champagne?",
      "Is pet nat natural wine?",
      "Is pet nat sweet?",
      "Why is pet nat cloudy?",
      "How do you open a bottle of pet nat?",
    ]);
    expect(
      article.internalLinks
        .filter((link) => link.label.en.trim().length > 0)
        .map((link) => link.href.en),
    ).toEqual([
      "/guides/what-is-natural-wine",
      "/guides/what-is-orange-wine",
      "/guides/worlds-best-natural-wine-producers",
      "/wine/pet-nat",
    ]);
    const styles = whatIsNaturalWineArticle.sections.find(
      (section) => section.heading?.en === "Natural wine styles",
    );
    const stylesEn = Array.isArray(styles?.body.en)
      ? styles.body.en.join("\n")
      : (styles?.body.en ?? "");
    expect(stylesEn).toContain(
      "[Pét-nat](/guides/what-is-pet-nat)",
    );
  });

  it("has no em dashes and no Swedish letters in English copy", () => {
    for (const article of [
      bestPetNatWinesSystembolagetArticle,
      whatIsPetNatArticle,
    ]) {
      for (const text of collectStrings(article)) {
        // Allow en dash (draft/editorial style); forbid em dash only.
        expect(text).not.toMatch(/[—]/);
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

  it("keeps Swedish titles, canonicals and hreflang, and renders relative links", async () => {
    const listMeta = await buildSystembolagetRankedListMetadata(
      bestPetNatWinesSystembolagetSvArticle,
      "sv",
    );
    expect(listMeta.title).toBe("Bästa pet nat på Systembolaget – vårt urval");
    expect(listMeta.alternates).toEqual({
      canonical: "https://pactwines.com/guider/basta-pet-nat-systembolaget",
      languages: {
        sv: "https://pactwines.com/guider/basta-pet-nat-systembolaget",
        en: "https://pactwines.com/guides/best-pet-nat-systembolaget",
        "x-default": "https://pactwines.com/guider/basta-pet-nat-systembolaget",
      },
    });

    const explainerMeta = buildArticleGuideMeta(
      whatIsPetNatArticle,
      "sv",
      "https://pactwines.com",
      "PACT Wines",
    );
    expect(explainerMeta.title).toBe(
      "Vad är pet nat? Så görs pétillant naturel",
    );
    expect(explainerMeta.alternates).toEqual({
      canonical: "https://pactwines.com/guider/vad-ar-pet-nat",
      languages: {
        sv: "https://pactwines.com/guider/vad-ar-pet-nat",
        en: "https://pactwines.com/guides/what-is-pet-nat",
        "x-default": "https://pactwines.com/guides/what-is-pet-nat",
      },
    });

    const section = bestPetNatWinesSystembolagetSvArticle.sections.find(
      (item) => item.heading?.sv === "Vad är pét-nat?",
    );
    const paragraph = Array.isArray(section?.body.sv) ? section.body.sv[1] : "";
    const listHtml = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        renderArticleRichText(paragraph ?? "", "pet-nat"),
      ),
    );
    expect(listHtml).toContain('href="/guider/vad-ar-pet-nat"');
    expect(listHtml).toContain('href="/vin/pet-nat"');
    expect(listHtml).toContain(">pet nat<");
    expect(listHtml).toContain(">köp pet nat direkt från producenten<");
    expect(listHtml).not.toContain("nofollow");
    expect(listHtml).not.toContain("http");

    const explainerHtml = renderToStaticMarkup(
      await renderArticleGuidePage(whatIsPetNatArticle, "sv"),
    );
    expect(explainerHtml).toContain(
      'href="/guider/basta-pet-nat-systembolaget"',
    );
    expect(explainerHtml).toContain(">pet nat på Systembolaget<");
    expect(explainerHtml).toContain('href="/vin/pet-nat"');
    expect(explainerHtml).toContain(">Pet nat att köpa →<");
    expect(explainerHtml.match(/href="\/guider\/basta-pet-nat-systembolaget"/g)).toHaveLength(1);
    expect(explainerHtml.match(/href="\/vin\/pet-nat"/g)).toHaveLength(1);
    const explainerBody = explainerHtml.split("Vidare läsning")[0] ?? "";
    expect(explainerBody.match(/href="\/guider\/basta-pet-nat-systembolaget"/g)).toHaveLength(1);
    expect(explainerBody).not.toContain('href="/vin/pet-nat"');
    expect(explainerHtml).not.toMatch(/href="\/guider\/basta-pet-nat-systembolaget"[^>]*nofollow/);
    expect(explainerHtml).not.toMatch(/href="\/vin\/pet-nat"[^>]*nofollow/);
    expect(explainerHtml).toContain('"dateModified":"2026-11-24"');
    expect(explainerHtml).not.toContain("Naturviner hos PACT");
    expect(articleUpdatedOn(whatIsPetNatArticle, "en")).toBe("2026-11-07");
    expect(articleUpdatedOn(whatIsPetNatArticle, "sv")).toBe("2026-11-24");
    for (const question of [
      "Vad är pet nat?",
      "Är pet nat samma sak som champagne?",
      "Är pet nat alltid naturvin?",
      "Är pet nat alltid torrt?",
      "Varför är vinet grumligt?",
      "Hur öppnar man en pet nat?",
    ]) {
      expect(explainerHtml).toContain(`"name":${JSON.stringify(question)}`);
    }
  });
});
