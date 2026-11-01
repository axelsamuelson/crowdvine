import { describe, expect, it } from "vitest";

import {
  bestOrangeNaturalWinesSystembolagetArticle,
  bestOrangeNaturalWinesSystembolagetSvArticle,
} from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { categoryPageTitle } from "@/lib/seo/category-page-title";

describe("best orange natural wines Systembolaget guide", () => {
  it("keeps the Swedish URL and English hreflang pair", () => {
    expect(articlePath(bestOrangeNaturalWinesSystembolagetSvArticle, "sv")).toBe(
      "/guider/basta-orange-naturviner-systembolaget",
    );
    expect(articlePath(bestOrangeNaturalWinesSystembolagetArticle, "en")).toBe(
      "/guides/best-orange-natural-wines-systembolaget",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.slug).toEqual(
      bestOrangeNaturalWinesSystembolagetArticle.slug,
    );
  });

  it("uses the draft H1, meta title and description for Swedish", () => {
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.h1.sv).toBe(
      "Bra orange vin på Systembolaget",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.meta.sv).toBe(
      "Bästa orange vin på Systembolaget enligt PACT: vårt urval med äkta skalkontakt, fakta om druva och producent samt vanliga frågor.",
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.title.sv).toBe(
      "Bästa orange vin på Systembolaget – vårt urval | PACT",
    );
    // Layout title.template adds " | PACT Wines"; strip brand suffix to avoid doubling.
    expect(
      categoryPageTitle(
        bestOrangeNaturalWinesSystembolagetSvArticle.title.sv,
        "PACT Wines",
      ),
    ).toBe("Bästa orange vin på Systembolaget – vårt urval");
  });

  it("credits Axel Samuelson with Person-ready author fields and FAQ schema source", () => {
    const author = bestOrangeNaturalWinesSystembolagetSvArticle.author;
    expect(author?.name).toBe("Axel Samuelson");
    expect(author?.jobTitle).toBe("Grundare av PACT");
    expect(author?.byline.sv).toContain("grundare av PACT");
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.faqs?.length).toBeGreaterThanOrEqual(
      6,
    );
    expect(bestOrangeNaturalWinesSystembolagetSvArticle.shopCta).toBeNull();
  });

  it("anchors the shortlist to wine heading ids without prices or shop CTAs", () => {
    const listSection = bestOrangeNaturalWinesSystembolagetSvArticle.sections.find(
      (section) => section.heading?.sv === "Listan",
    );
    const ids = (listSection?.blocks ?? [])
      .filter((block) => block.type === "heading")
      .map((block) => (block.type === "heading" ? block.id : undefined));
    expect(ids).toEqual(
      expect.arrayContaining([
        "radikon-ribolla",
        "luc-faller-macerat",
        "binner-bombisch",
        "grape-republic-bianco-macerato",
        "abbazia-san-giorgio-orange-zibibbo",
        "arndorfer-orange",
        "qvevris-mze-kisi",
      ]),
    );

    const factBlocks = (listSection?.blocks ?? []).filter(
      (block) => block.type === "definitions",
    );
    expect(factBlocks.length).toBeGreaterThanOrEqual(7);
    expect(factBlocks[0]).toMatchObject({
      type: "definitions",
      items: expect.arrayContaining([
        expect.objectContaining({
          term: expect.objectContaining({ sv: "Producent och region" }),
        }),
      ]),
    });

    const serialized = JSON.stringify(bestOrangeNaturalWinesSystembolagetSvArticle);
    expect(serialized).not.toMatch(/\d+\s*kr\b/);
    expect(serialized).not.toMatch(/köp nu|shop now|lägg i kundvagn/i);
    expect(serialized).toContain("Inte alla viner på listan är naturvin");
    expect(serialized).not.toContain("Alla viner här är inte naturviner");
  });
});
