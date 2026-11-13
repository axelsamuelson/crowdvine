import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bestWhiteNaturalWinesSystembolagetArticle,
  bestWhiteNaturalWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import {
  guideEditorialNoteHadValueJudgement,
  neutralizeGuideEditorialNote,
} from "@/lib/guides/neutralize-guide-editorial-note";
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

  it("credits Axel Samuelson with Person-ready author fields and FAQ schema source", () => {
    const author = bestWhiteNaturalWinesSystembolagetSvArticle.author;
    expect(author?.name).toBe("Axel Samuelson");
    expect(author?.jobTitle).toBe("Grundare av PACT");
    expect(author?.byline.sv).toBe(
      "Av Axel Samuelson, grundare av PACT · Senast granskad: 2026-11-10",
    );
    expect(
      bestWhiteNaturalWinesSystembolagetSvArticle.faqs?.length,
    ).toBeGreaterThanOrEqual(6);
    expect(bestWhiteNaturalWinesSystembolagetSvArticle.shopCta).toBeNull();
  });

  it("keeps the editorial sections and opts into note neutralization", () => {
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
    expect(
      bestWhiteNaturalWinesSystembolagetSvArticle.neutralizeRankedEditorialNotes,
    ).toBe(true);
    expect(
      bestWhiteNaturalWinesSystembolagetArticle.neutralizeRankedEditorialNotes,
    ).toBeUndefined();

    const page = readFileSync(
      "app/guider/basta-vita-naturviner-systembolaget/page.tsx",
      "utf8",
    );
    expect(page).toContain("bestWhiteNaturalWinesSystembolagetSvArticle");
    expect(page).toContain('"white"');
    expect(page).not.toContain("renderArticleGuidePage");
  });

  it("scrubs value judgements from database-sourced white notes at render time", () => {
    const samples = [
      {
        id: 65,
        before:
          "Jean-Laurent och Jean-Dominique Vacheron ställde om hela familjedomänet till biodynamisk odling redan år 2000, tidigt för Sancerre. Les Roches är basvinet, sauvignon blanc från kalkstensjordar med en salthet som sällan finns i appellationen. Ligger i fasta sortimentet, vilket gör den ovanligt tillgänglig för ett vin på den här nivån.",
      },
      {
        id: 66,
        before:
          "François Chidaine är tillsammans med Jacky Blot den som satte Montlouis på kartan, biodynamiskt certifierad genom Biodyvin. Les Tuffeaux är chenin blanc från tuffeaujord, torrt och spänstigt, och visar varför Chidaine räknas som en av Loires viktigaste vitvinsproducenter oavsett appellation.",
      },
      {
        id: 134,
        before:
          "Craig Hawkins är Sydafrikas mest inflytelserika naturvinsproducent. Testalonga ligger i Swartland där gamla stockar och granit ger viner med spänst och salt mineralitet. Inget tillsatt svavel.",
      },
      {
        id: 135,
        before:
          "Meinklang i Burgenland är Demeter-certifierade och driver en av Österrikes största biodynamiska gårdar. Naken är precis vad namnet antyder: grüner veltliner utan tillsatt svavel, okomplicerat och drickligt. Ligger i fasta sortimentet till ett pris som gör den till en självklar vardagsflaska.",
      },
    ];

    for (const sample of samples) {
      expect(guideEditorialNoteHadValueJudgement(sample.before)).toBe(true);
      const after = neutralizeGuideEditorialNote(sample.before);
      expect(after.toLocaleLowerCase("sv-SE")).not.toMatch(
        /bästa|fantastisk|perfekt|mest hyllade|mest inflytelserika|vardagsvin|vardagsflaska|drickligt|satte montlouis|salthet som sällan/,
      );
      expect(after.length).toBeGreaterThan(20);
    }
  });
});
