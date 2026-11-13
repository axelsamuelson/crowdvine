import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bestWhiteNaturalWinesSystembolagetArticle,
  bestWhiteNaturalWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { categoryPageTitle } from "@/lib/seo/category-page-title";

describe("best white natural wines Systembolaget guide", () => {
  it("keeps the Swedish URL and English hreflang pair", () => {
    expect(articlePath(bestWhiteNaturalWinesSystembolagetSvArticle, "sv")).toBe(
      "/guider/basta-vita-naturviner-systembolaget",
    );
    expect(articlePath(bestWhiteNaturalWinesSystembolagetArticle, "en")).toBe(
      "/guides/best-white-natural-wines-systembolaget",
    );
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.slug).toEqual(
      bestWhiteNaturalWinesSystembolagetArticle.slug,
    );
  });

  it("uses the draft H1, meta title and description for Swedish", () => {
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.h1.sv).toBe(
      "Vitt naturvin på Systembolaget",
    );
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.meta.sv).toBe(
      "Vitt naturvin på Systembolaget enligt PACT: chenin blanc från Loire, grüner veltliner från Österrike, riesling, Tjeckien, Portugal och Sydafrika, med fakta om producent och druva och vanliga frågor.",
    );
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.title.sv).toBe(
      "Vitt naturvin på Systembolaget 2026: vårt urval | PACT Wines",
    );
    expect(
      categoryPageTitle(
        bestWhiteNaturalWinesSystembolagetSvArticle.title.sv,
        "PACT Wines",
      ),
    ).toBe("Vitt naturvin på Systembolaget 2026: vårt urval");
  });

  it("uses the English handoff H1, meta title and description", () => {
    expect(bestWhiteNaturalWinesSystembolagetArticle.h1.en).toBe(
      "White natural wine at Systembolaget",
    );
    expect(bestWhiteNaturalWinesSystembolagetArticle.meta.en).toBe(
      "White natural wine at Systembolaget according to PACT: chenin blanc from the Loire, grüner veltliner from Austria, riesling, Czechia, Portugal and South Africa, with facts on producer and grape and common questions.",
    );
    expect(bestWhiteNaturalWinesSystembolagetArticle.title.en).toBe(
      "White natural wine at Systembolaget 2026: our selection | PACT Wines",
    );
    expect(bestWhiteNaturalWinesSystembolagetArticle.lede?.en).toContain(
      "The prices on the cards are Systembolaget's own.",
    );
    expect(bestWhiteNaturalWinesSystembolagetArticle.showRankedWineFacts).toBe(
      true,
    );
    expect(
      bestWhiteNaturalWinesSystembolagetArticle.sections.map(
        (section) => section.heading?.en,
      ),
    ).toEqual([
      "Our selection at a glance",
      "How we chose",
      "What is white natural wine?",
      "Demeter and Biodyvin",
      "White natural wine and food",
    ]);
  });

  it("credits Axel Samuelson with Person-ready author fields and FAQ schema source", () => {
    const author = bestWhiteNaturalWinesSystembolagetSvArticle.author;
    expect(author?.name).toBe("Axel Samuelson");
    expect(author?.jobTitle).toBe("Grundare av PACT");
    expect(author?.byline.sv).toBe(
      "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-10",
    );
    expect(author?.byline.en).toBe(
      "By Axel Samuelson, founder of PACT · Last reviewed: 2026-11-10",
    );
    expect(
      bestWhiteNaturalWinesSystembolagetSvArticle.faqs?.length,
    ).toBeGreaterThanOrEqual(6);
    expect(
      bestWhiteNaturalWinesSystembolagetArticle.faqs?.length,
    ).toBeGreaterThanOrEqual(6);
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.shopCta).toBeNull();
  });

  it("keeps the editorial sections without render-time note scrubbing", () => {
    expect(
      bestWhiteNaturalWinesSystembolagetSvArticle.sections.map(
        (section) => section.heading?.sv,
      ),
    ).toEqual([
      "Vårt urval i korthet",
      "Så har vi valt",
      "Vad är vitt naturvin?",
      "Demeter och Biodyvin",
      "Vitt naturvin och mat",
    ]);
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.lede?.sv).toContain(
      "Priserna på korten är Systembolagets egna.",
    );
    expect(
      bestWhiteNaturalWinesSystembolagetSvArticle.showRankedWineFacts,
    ).toBe(true);

    const page = readFileSync(
      "app/guider/basta-vita-naturviner-systembolaget/page.tsx",
      "utf8",
    );
    expect(page).toContain("bestWhiteNaturalWinesSystembolagetSvArticle");
    expect(page).toContain('"white"');
    expect(page).not.toContain("renderArticleGuidePage");
    const english = readFileSync(
      "app/guides/best-white-natural-wines-systembolaget/page.tsx",
      "utf8",
    );
    expect(english).toContain("bestWhiteNaturalWinesSystembolagetArticle");
    expect(english).not.toContain("bestWhiteNaturalWinesSystembolagetSvArticle");
    expect(readFileSync("lib/guides/systembolaget-ranked-list.tsx", "utf8")).not.toContain(
      "neutralizeGuideEditorialNote",
    );
  });

  it("keeps shortlist wine names for auto-linking without hard-coded anchors", () => {
    const shortlist = bestWhiteNaturalWinesSystembolagetArticle.sections[0];
    const items = shortlist?.blocks?.[0];
    expect(items?.type).toBe("list");
    if (items?.type !== "list") return;
    const joined = items.items.en.join("\n");
    expect(joined).toContain("François Chidaine Les Tuffeaux");
    expect(joined).toContain("Meinklang Naken");
    expect(joined).toContain("Vacheron Sancerre Les Roches");
    expect(joined).not.toMatch(/\]\(#/);
  });
});
