import { describe, expect, it } from "vitest";

import {
  bestPetNatWinesSystembolagetArticle,
  bestPetNatWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { categoryPageTitle } from "@/lib/seo/category-page-title";

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
      "Bästa pet nat på Systembolaget",
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

  it("anchors the shortlist to wine heading ids without prices or shop CTAs", () => {
    const listSection = bestPetNatWinesSystembolagetSvArticle.sections.find(
      (section) => section.heading?.sv === "Listan",
    );
    const ids = (listSection?.blocks ?? [])
      .filter((block) => block.type === "heading")
      .map((block) => (block.type === "heading" ? block.id : undefined));
    expect(ids).toEqual([
      "haggan-pet-nat",
      "chidaine-petillant",
      "fio-piu-piu",
      "korab-orange-on-leaves",
      "henriot-bubulle",
      "faller-muscat",
      "riedlin-spatburgunder",
      "la-colombe-de-facto",
      "pranzegg-miaumiau",
      "puput-rose",
      "integrale-rose",
      "pino-roman-pais",
      "pequenos-rebentos",
    ]);

    const factBlocks = (listSection?.blocks ?? []).filter(
      (block) => block.type === "definitions",
    );
    expect(factBlocks.length).toBe(13);
    expect(factBlocks[0]).toMatchObject({
      type: "definitions",
      items: expect.arrayContaining([
        expect.objectContaining({
          term: expect.objectContaining({ sv: "Producent och region" }),
        }),
      ]),
    });

    const odlingCount = factBlocks.filter((block) =>
      block.type === "definitions" &&
      block.items.some((item) => item.term.sv === "Odling"),
    ).length;
    expect(odlingCount).toBe(9);
    expect(
      factBlocks.every(
        (block) =>
          block.type !== "definitions" ||
          block.items.every(
            (item) =>
              item.term.sv !== "Sortiment" ||
              !/\(ekologiskt enligt Systembolaget\)/.test(item.description.sv),
          ),
      ),
    ).toBe(true);

    const grapeFor = (id: string) => {
      const blocks = listSection?.blocks ?? [];
      const hi = blocks.findIndex(
        (block) => block.type === "heading" && block.id === id,
      );
      const def = blocks[hi + 1];
      if (def?.type !== "definitions") return undefined;
      return def.items.find((item) => item.term.sv === "Druva")?.description.sv;
    };
    expect(grapeFor("korab-orange-on-leaves")).toBe("Uppgift saknas");
    expect(ids).not.toContain("binner-storm");

    const serialized = JSON.stringify(bestPetNatWinesSystembolagetSvArticle);
    expect(serialized).not.toMatch(/binner/i);
    expect(serialized).not.toMatch(/\d+\s*kr\b/);
    expect(serialized).not.toMatch(/köp nu|shop now|lägg i kundvagn/i);
    expect(serialized).toContain(
      "Inte alla viner på listan är belagda som naturvin",
    );
    expect(serialized).toContain("Fio och Koráb");
    expect(serialized).not.toContain("Binner, Fio");
    expect(bestPetNatWinesSystembolagetSvArticle.sections.some(
      (section) => section.heading?.sv === "Vad är pét-nat?",
    )).toBe(true);
  });
});
