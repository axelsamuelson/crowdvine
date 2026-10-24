import { describe, expect, it } from "vitest";
import { producerShopMetaDescription } from "@/lib/seo/producer-shop-metadata";
import { defaultOgImageAlt } from "@/lib/seo/default-social";
import { producerShopEditorialBio } from "@/components/producer/producer-shop-editorial";

describe("seo copy cleanup", () => {
  it("removes direkt från / direct from on wine-boxes meta", () => {
    const sv = producerShopMetaDescription("sv", {
      producerName: "Wine Boxes",
      handle: "wine-boxes",
    });
    const en = producerShopMetaDescription("en", {
      producerName: "Wine Boxes",
      handle: "wine-boxes",
    });
    expect(sv.toLowerCase()).not.toContain("direkt från");
    expect(en.toLowerCase()).not.toContain("direct from");
    expect(en.toLowerCase()).not.toContain("directly from");
    expect(sv).toContain("wine boxes");
    expect(en).toContain("wine boxes");
  });

  it("uses site-aware OG alt without Languedoc direct-import claim", () => {
    expect(defaultOgImageAlt({ siteName: "PACT Wines", locale: "sv" })).toBe(
      "Naturvin online",
    );
    expect(defaultOgImageAlt({ siteName: "PACT Wines", locale: "en" })).toBe(
      "Natural wine online",
    );
    expect(defaultOgImageAlt({ siteName: "Dirty Wine", locale: "sv" })).toBe(
      "Dirty Wine — Naturvin online",
    );
    expect(defaultOgImageAlt({ siteName: "Dirty Wine", locale: "en" })).toBe(
      "Dirty Wine — Natural wine online",
    );
  });

  it("softens La Marotte additive claims in shop editorial", () => {
    const sv = producerShopEditorialBio(
      {
        handle: "la-marotte",
        shortDescription: {
          sv: "Naturvin utan tillsatser, inga sulfiter, manuell skörd.",
        },
      },
      "sv",
    );
    const en = producerShopEditorialBio(
      {
        handle: "la-marotte",
        shortDescription: {
          en: "Natural wine with no additives, no sulphites, hand-harvested.",
        },
      },
      "en",
    );
    expect(sv).toContain("med få eller inga tillsatser");
    expect(sv).not.toContain("utan tillsatser");
    expect(en).toContain("with few or no additives");
    expect(en).not.toMatch(/\bwith no additives\b/);
  });
});
