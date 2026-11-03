import { describe, expect, it } from "vitest";

import { bestNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-systembolaget";
import { bestOrangeNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import { bestRedNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import { bestWhiteNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import {
  articleLinkText,
  articleVisibleForLocale,
} from "@/lib/guides/guide-types";
import { guideCopy } from "@/lib/guides/guide-copy";

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

describe("what is natural wine", () => {
  it("keeps the title, h1 and the section order", () => {
    expect(whatIsNaturalWineArticle.title.sv).toBe(
      "Vad är naturvin? Definition, sulfiter och hur det görs",
    );
    expect(whatIsNaturalWineArticle.title.en).toBe(
      "What Is Natural Wine? Meaning, Sulfites and Organic vs Natural",
    );
    expect(whatIsNaturalWineArticle.title.sv.length).toBeLessThanOrEqual(60);
    expect(whatIsNaturalWineArticle.meta.en).toBe(
      "Natural wine means low intervention: organic grapes, wild fermentation and little or no added sulfites. What it tastes like, US and EU sulfite rules, and how it differs from organic wine.",
    );
    expect(whatIsNaturalWineArticle.absoluteTitle).toEqual({ en: true });
    const enTitle = whatIsNaturalWineArticle.title.en;
    expect(enTitle.length).toBeLessThanOrEqual(65);
    expect(`${enTitle} | PACT Wines`.length).toBeGreaterThan(65);
    expect(
      buildArticleGuideMeta(
        whatIsNaturalWineArticle,
        "en",
        "https://pactwines.com",
        "PACT Wines",
      ).title,
    ).toEqual({ absolute: enTitle });
    expect(whatIsNaturalWineArticle.h1).toEqual({
      sv: "Vad är naturvin?",
      en: "What is natural wine?",
    });
    expect(whatIsNaturalWineArticle.meta.sv.length).toBeLessThanOrEqual(160);
    expect(
      articleVisibleForLocale(whatIsNaturalWineArticle.sections, "sv").map(
        (section) => section.heading?.sv,
      ),
    ).toEqual([
      "Naturvin i korthet",
      "Naturvin och sulfiter",
      "Låg intervention i vingården och källaren",
      "Naturvin, ekologiskt och biodynamiskt: skillnaden",
      "Finns naturvin på Systembolaget?",
      "Så smakar naturvin",
      "Vitt naturvin",
      "Rött naturvin",
      "Var görs naturvin?",
    ]);
    expect(
      articleVisibleForLocale(whatIsNaturalWineArticle.sections, "en").map(
        (section) => section.heading?.en,
      ),
    ).toEqual([
      "What does natural wine mean?",
      "Low intervention and zero-zero wine",
      "Natural wine and sulfites",
      "Natural wine vs organic wine vs biodynamic wine",
      "What does natural wine taste like?",
      "Natural wine styles",
      "White natural wine",
      "Red natural wine",
      "Mousy wine: the fault to know about",
      "Where is natural wine made?",
    ]);
    expect(
      articleVisibleForLocale(whatIsNaturalWineArticle.faqs ?? [], "sv").map(
        (faq) => faq.question.sv,
      ),
    ).toEqual([
      "Vad är naturvin?",
      "Innehåller naturvin sulfiter?",
      "Är naturvin ekologiskt?",
      "Är naturvin samma som orange vin?",
      "Var köper man naturvin i Sverige?",
    ]);
    expect(
      articleVisibleForLocale(whatIsNaturalWineArticle.faqs ?? [], "en").map(
        (faq) => faq.question.en,
      ),
    ).toEqual([
      "What is natural wine?",
      "Does natural wine have sulfites?",
      "Is natural wine organic?",
      "What is the difference between natural wine and orange wine?",
      "Why is natural wine cloudy?",
      "What is a mousy wine?",
    ]);
    expect(whatIsNaturalWineArticle.updated).toBe("2026-11-03");
  });

  it("states only the sourced sulphur ceilings", () => {
    const sv = whatIsNaturalWineArticle.sections
      .flatMap((section) =>
        Array.isArray(section.body.sv) ? section.body.sv : [section.body.sv],
      )
      .join("\n");
    for (const figure of ["150 mg/l", "200 mg/l", "250 mg/l", "100 mg/l", "30 mg/l", "20 mg/l", "10 mg/l"]) {
      expect(sv).toContain(figure);
    }
    expect(sv).toContain("2019/934");
    expect(sv).toContain("2021/1165");
    expect(sv).toContain("1169/2011");
    expect(sv).toContain("ingen officiell typisk dos");
  });

  it("has no em dashes and no Swedish letters in English copy", () => {
    for (const text of collectStrings(whatIsNaturalWineArticle)) {
      expect(text).not.toMatch(/[—–]/);
    }
    const english = collectStrings({
      title: whatIsNaturalWineArticle.title.en,
      meta: whatIsNaturalWineArticle.meta.en,
      h1: whatIsNaturalWineArticle.h1.en,
      lede: whatIsNaturalWineArticle.lede?.en,
      hub: whatIsNaturalWineArticle.hubCard.title.en,
      hubDescription: whatIsNaturalWineArticle.hubCard.description.en,
      sections: whatIsNaturalWineArticle.sections.map((section) => ({
        heading: section.heading?.en,
        body: section.body.en,
      })),
      faqs: whatIsNaturalWineArticle.faqs?.map((faq) => ({
        question: faq.question.en,
        answer: faq.answer.en,
      })),
      links: whatIsNaturalWineArticle.internalLinks.map((link) => link.label.en),
    });
    for (const text of english) {
      expect(text).not.toMatch(/[åäöÅÄÖ]/);
    }
    const visibleEnglish = [
      whatIsNaturalWineArticle.title.en,
      whatIsNaturalWineArticle.meta.en,
      whatIsNaturalWineArticle.h1.en,
      whatIsNaturalWineArticle.lede?.en ?? "",
      ...articleVisibleForLocale(whatIsNaturalWineArticle.sections, "en").flatMap(
        (section) => [
          section.heading?.en ?? "",
          ...(Array.isArray(section.body.en)
            ? section.body.en
            : [section.body.en]),
        ],
      ),
      ...articleVisibleForLocale(whatIsNaturalWineArticle.faqs ?? [], "en").flatMap(
        (faq) => [faq.question.en, faq.answer.en],
      ),
      ...whatIsNaturalWineArticle.internalLinks
        .filter((link) => link.label.en.trim().length > 0)
        .map((link) => `${link.label.en} ${link.href.en}`),
    ].join("\n");
    expect(visibleEnglish).not.toMatch(/Systembolaget/i);
    expect(visibleEnglish).not.toMatch(/\bSweden\b/);
    expect(visibleEnglish).toContain("27 CFR 4.32(e)");
    expect(visibleEnglish).toContain("USDA");
    expect(visibleEnglish).toContain("100 ppm");
  });

  it("strips markdown links in FAQ answers", () => {
    const answer =
      whatIsNaturalWineArticle.faqs?.find(
        (faq) => faq.question.sv === "Är naturvin samma som orange vin?",
      )?.answer.sv ?? "";
    expect(articleLinkText(answer)).toBe(
      "Nej. Orange vin är vitt vin som jäst med skalen. Det kan vara naturvin, men skalkontakt är en metod. Läs mer i Vad är orange vin?.",
    );
    expect(articleLinkText(answer)).not.toContain("](");
  });

  it("links in from the parent, the colour lists and the hub card", () => {
    for (const article of [
      bestNaturalWinesSystembolagetArticle,
      bestRedNaturalWinesSystembolagetArticle,
      bestWhiteNaturalWinesSystembolagetArticle,
      bestOrangeNaturalWinesSystembolagetArticle,
    ]) {
      const link = article.internalLinks.find(
        (item) => item.href.sv === "/guider/vad-ar-naturvin",
      );
      expect(link?.label).toEqual({
        sv: "vad är naturvin",
        en: "what is natural wine",
      });
    }
    expect(bestNaturalWinesSystembolagetArticle.updated).toBe("2026-10-12");
    expect(bestRedNaturalWinesSystembolagetArticle.updated).toBe("2026-10-12");
    expect(bestWhiteNaturalWinesSystembolagetArticle.updated).toBe("2026-10-12");
    expect(bestOrangeNaturalWinesSystembolagetArticle.updated).toBe("2026-11-01");

    const hub = guideCopy("sv").hubSections.find((section) => section.title === "Guider");
    expect(hub?.cards.some((card) => card.href === "/guider/vad-ar-naturvin")).toBe(
      true,
    );
  });
});
