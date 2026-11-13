import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bestRedNaturalWinesSystembolagetArticle,
  bestRedNaturalWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { categoryPageTitle } from "@/lib/seo/category-page-title";

describe("best red natural wines Systembolaget guide", () => {
  it("keeps the Swedish URL and English hreflang pair", () => {
    expect(articlePath(bestRedNaturalWinesSystembolagetSvArticle, "sv")).toBe(
      "/guider/basta-roda-naturviner-systembolaget",
    );
    expect(articlePath(bestRedNaturalWinesSystembolagetArticle, "en")).toBe(
      "/guides/best-red-natural-wines-systembolaget",
    );
    expect(bestRedNaturalWinesSystembolagetSvArticle.slug).toEqual(
      bestRedNaturalWinesSystembolagetArticle.slug,
    );
  });

  it("uses the draft H1, meta title and description for Swedish", () => {
    expect(bestRedNaturalWinesSystembolagetSvArticle.h1.sv).toBe(
      "Rött naturvin på Systembolaget",
    );
    expect(bestRedNaturalWinesSystembolagetSvArticle.meta.sv).toBe(
      "Rött naturvin på Systembolaget enligt PACT: lätta och kylbara röda, klassiker från Loire och Beaujolais, Sicilien, Österrike och Chile, med fakta om producent och druva och vanliga frågor.",
    );
    expect(bestRedNaturalWinesSystembolagetSvArticle.title.sv).toBe(
      "Rött naturvin på Systembolaget 2026: vårt urval | PACT Wines",
    );
    expect(
      categoryPageTitle(
        bestRedNaturalWinesSystembolagetSvArticle.title.sv,
        "PACT Wines",
      ),
    ).toBe("Rött naturvin på Systembolaget 2026: vårt urval");
  });

  it("uses the English handoff H1, meta title and description", () => {
    expect(bestRedNaturalWinesSystembolagetArticle.h1.en).toBe(
      "Red natural wine at Systembolaget",
    );
    expect(bestRedNaturalWinesSystembolagetArticle.meta.en).toBe(
      "Red natural wine at Systembolaget according to PACT: light, chillable reds, classics from the Loire and Beaujolais, Sicily, Austria and Chile, with facts on producer and grape and common questions.",
    );
    expect(bestRedNaturalWinesSystembolagetArticle.title.en).toBe(
      "Red natural wine at Systembolaget 2026: our selection | PACT Wines",
    );
    expect(bestRedNaturalWinesSystembolagetArticle.lede?.en).toContain(
      "The prices on the cards are Systembolaget's own.",
    );
    expect(bestRedNaturalWinesSystembolagetArticle.showRankedWineFacts).toBe(
      true,
    );
    expect(
      bestRedNaturalWinesSystembolagetArticle.sections.map(
        (section) => section.heading?.en,
      ),
    ).toEqual([
      "Our selection at a glance",
      "How we chose",
      "What is red natural wine?",
      "Red natural wine and food",
    ]);
  });

  it("credits Axel Samuelson with Person-ready author fields and FAQ schema source", () => {
    const author = bestRedNaturalWinesSystembolagetSvArticle.author;
    expect(author?.name).toBe("Axel Samuelson");
    expect(author?.jobTitle).toBe("Grundare av PACT");
    expect(author?.byline.sv).toBe(
      "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-09",
    );
    expect(author?.byline.en).toBe(
      "By Axel Samuelson, founder of PACT · Last reviewed: 2026-11-09",
    );
    expect(
      bestRedNaturalWinesSystembolagetSvArticle.faqs?.length,
    ).toBeGreaterThanOrEqual(6);
    expect(bestRedNaturalWinesSystembolagetArticle.faqs?.length).toBeGreaterThanOrEqual(
      6,
    );
    expect(bestRedNaturalWinesSystembolagetSvArticle.shopCta).toBeNull();
  });

  it("keeps the editorial sections and drops the hardcoded wine list", () => {
    expect(
      bestRedNaturalWinesSystembolagetSvArticle.sections.map(
        (section) => section.heading?.sv,
      ),
    ).toEqual([
      "Vårt urval i korthet",
      "Så har vi valt",
      "Vad är rött naturvin?",
      "Rött naturvin och mat",
    ]);
    expect(bestRedNaturalWinesSystembolagetSvArticle.lede?.sv).toContain(
      "Priserna på korten är Systembolagets egna.",
    );
    expect(bestRedNaturalWinesSystembolagetSvArticle.lede?.sv).not.toContain(
      "Languedoc",
    );
    const serialized = JSON.stringify(bestRedNaturalWinesSystembolagetSvArticle);
    expect(serialized).toContain(
      "Inte alla viner på listan är belagda som naturvin",
    );
    expect(serialized).not.toContain("#lamoresca-nerocapitano");
    expect(serialized).not.toContain("Producent och region");
    expect(bestRedNaturalWinesSystembolagetSvArticle.showRankedWineFacts).toBe(
      true,
    );

    const page = readFileSync(
      "app/guider/basta-roda-naturviner-systembolaget/page.tsx",
      "utf8",
    );
    expect(page).toContain("renderSystembolagetRankedListPage");
    expect(page).toContain('"red"');
    expect(page).toContain("bestRedNaturalWinesSystembolagetSvArticle");
    expect(page).not.toContain("renderArticleGuidePage");
    const english = readFileSync(
      "app/guides/best-red-natural-wines-systembolaget/page.tsx",
      "utf8",
    );
    expect(english).toContain("bestRedNaturalWinesSystembolagetArticle");
    expect(english).not.toContain("bestRedNaturalWinesSystembolagetSvArticle");
  });

  it("keeps shortlist wine names for auto-linking without hard-coded anchors", () => {
    const shortlistSv = bestRedNaturalWinesSystembolagetSvArticle.sections[0];
    const itemsSv = shortlistSv?.blocks?.[0];
    expect(itemsSv?.type).toBe("list");
    if (itemsSv?.type !== "list") return;
    const joinedSv = itemsSv.items.sv.join("\n");
    expect(joinedSv).toContain("Lamoresca Nerocapitano");
    expect(joinedSv).toContain("Sandrine Henriot Morgon Vagabond");
    expect(joinedSv).toContain("Gut Oggau Josephine");
    expect(joinedSv).not.toMatch(/\]\(#/);

    const shortlistEn = bestRedNaturalWinesSystembolagetArticle.sections[0];
    const itemsEn = shortlistEn?.blocks?.[0];
    expect(itemsEn?.type).toBe("list");
    if (itemsEn?.type !== "list") return;
    const joinedEn = itemsEn.items.en.join("\n");
    expect(joinedEn).toContain("Lamoresca Nerocapitano");
    expect(joinedEn).toContain("Sandrine Henriot Morgon Vagabond");
    expect(joinedEn).not.toMatch(/\]\(#/);
  });
});
