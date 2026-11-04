import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bestPetNatWinesSystembolagetArticle,
  bestPetNatWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { linkNamedWines } from "@/lib/guides/systembolaget-ranked-list";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import type { SystembolagetGuideWine } from "@/lib/systembolaget/guide-wines";

describe("best pet nat Systembolaget guide", () => {
  it("keeps the Swedish URL and English hreflang pair", () => {
    expect(articlePath(bestPetNatWinesSystembolagetSvArticle, "sv")).toBe(
      "/guider/basta-pet-nat-systembolaget",
    );
    expect(articlePath(bestPetNatWinesSystembolagetArticle, "en")).toBe(
      "/guides/best-pet-nat-systembolaget",
    );
    expect(bestPetNatWinesSystembolagetSvArticle.slug).toEqual(
      bestPetNatWinesSystembolagetArticle.slug,
    );
  });

  it("uses the draft H1, meta title and description for Swedish", () => {
    expect(bestPetNatWinesSystembolagetSvArticle.h1.sv).toBe(
      "Bästa pet nat på Systembolaget 2026",
    );
    expect(bestPetNatWinesSystembolagetSvArticle.meta.sv).toBe(
      "Bästa pet nat på Systembolaget enligt PACT: pét-nat från Loire, Alsace, Mosel, Chile med flera, med fakta om druva och producent, vad pét-nat är och vanliga frågor.",
    );
    expect(bestPetNatWinesSystembolagetSvArticle.title.sv).toBe(
      "Bästa pet nat på Systembolaget – vårt urval | PACT",
    );
    // Layout title.template adds " | PACT Wines"; strip brand suffix to avoid doubling.
    const stripped = categoryPageTitle(
      bestPetNatWinesSystembolagetSvArticle.title.sv,
      "PACT Wines",
    );
    expect(stripped).toBe("Bästa pet nat på Systembolaget – vårt urval");
    expect(stripped.length).toBeLessThanOrEqual(60);
  });

  it("credits Axel Samuelson with Person-ready author fields and FAQ schema source", () => {
    const author = bestPetNatWinesSystembolagetSvArticle.author;
    expect(author?.name).toBe("Axel Samuelson");
    expect(author?.jobTitle).toBe("Grundare av PACT");
    expect(author?.byline.sv).toContain("grundare av PACT");
    expect(
      bestPetNatWinesSystembolagetSvArticle.faqs?.length,
    ).toBeGreaterThanOrEqual(6);
    expect(bestPetNatWinesSystembolagetSvArticle.shopCta).toBeNull();
  });

  it("keeps the editorial sections and drops the hardcoded wine list", () => {
    expect(
      bestPetNatWinesSystembolagetSvArticle.sections.map(
        (section) => section.heading?.sv,
      ),
    ).toEqual([
      "Vårt urval i korthet",
      "Så har vi valt",
      "Vad vi inte listar",
      "Vad är pét-nat?",
      "Pét-nat och mat",
    ]);
    const avoid = bestPetNatWinesSystembolagetSvArticle.sections.find(
      (section) => section.heading?.en === "What we don't list",
    );
    const avoidSv = Array.isArray(avoid?.body.sv)
      ? avoid.body.sv.join("\n")
      : (avoid?.body.sv ?? "");
    expect(avoidSv).toContain(
      "Mousserande vin som bara har ett naturligt klingande ord på etiketten",
    );
    expect(avoidSv).toContain("Vi utgår från producenten, inte från stilnamnet.");
    const serialized = JSON.stringify(bestPetNatWinesSystembolagetSvArticle);
    expect(serialized).toContain(
      "**Om tillsatser:** Systembolagets data visar inte tillsatser eller sulfithalt. Där en importör uppger det (Fio Piu Piu)",
    );
    expect(serialized).not.toContain("Inga priser");
    expect(serialized).not.toContain("#haggan-pet-nat");
    expect(serialized).not.toContain("Producent och region");
    expect(bestPetNatWinesSystembolagetSvArticle.showRankedWineFacts).toBe(true);
    expect(bestPetNatWinesSystembolagetArticle.showRankedWineFacts).toBeUndefined();
    expect(bestPetNatWinesSystembolagetArticle.h1.en).toBe(
      "Best pet nat at Systembolaget 2026",
    );
    const page = readFileSync(
      "app/guider/basta-pet-nat-systembolaget/page.tsx",
      "utf8",
    );
    expect(page).toContain("renderSystembolagetRankedListPage");
    expect(page).toContain('"petnat"');
    expect(page).not.toContain("renderArticleGuidePage");
    const english = readFileSync(
      "app/guides/best-pet-nat-systembolaget/page.tsx",
      "utf8",
    );
    expect(english).toContain("bestPetNatWinesSystembolagetArticle");
    expect(english).not.toContain("bestPetNatWinesSystembolagetSvArticle");
  });

  it("links shortlist names to the database wine, including an accented spelling", () => {
    const korab = {
      id: 1,
      product_number: "1",
      producer_name: "Mgr. Petr Korab",
      name_bold: "Petr Korab",
      name_thin: "Orange on Leaves Pet Nat",
    } as SystembolagetGuideWine;
    const henriot = {
      id: 2,
      product_number: "2",
      producer_name: "Sandrine Henriot",
      name_bold: "Sandrine Henriot",
      name_thin: "PetNat Bubulle",
    } as SystembolagetGuideWine;
    expect(
      linkNamedWines("Petr Koráb Orange on Leaves och Sandrine Henriot PetNat Bubulle.", [
        korab,
        henriot,
      ]),
    ).toBe(
      "[Petr Koráb Orange on Leaves](#mgr-petr-korab-orange-on-leaves-pet-nat) och [Sandrine Henriot PetNat Bubulle](#sandrine-henriot-petnat-bubulle).",
    );
  });
});
