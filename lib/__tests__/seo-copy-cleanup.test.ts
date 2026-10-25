import { describe, expect, it } from "vitest";
import { defaultOgImageAlt } from "@/lib/seo/default-social";
import { producerShopEditorialBio } from "@/components/producer/producer-shop-editorial";
import { PRODUCER_BOXES_COPY } from "@/lib/producer-boxes/config";

describe("seo copy cleanup", () => {
  it("keeps producer-box meta short and free of Languedoc/direct/urgency claims", () => {
    const sv = PRODUCER_BOXES_COPY.sv.meta;
    const en = PRODUCER_BOXES_COPY.en.meta;
    expect(sv.length).toBeLessThan(160);
    expect(en.length).toBeLessThan(160);
    for (const meta of [sv, en]) {
      const lower = meta.toLowerCase();
      expect(lower).not.toContain("languedoc");
      expect(lower).not.toContain("direkt");
      expect(lower).not.toContain("direct");
      expect(lower).not.toContain("utan tillsatser");
      expect(lower).not.toContain("without additives");
      expect(lower).not.toContain("reservera innan");
      expect(lower).not.toContain("reserve before");
      expect(lower).not.toContain("pallen");
      expect(lower).not.toContain("pallet");
    }
    expect(sv).toContain("en producent");
    expect(en).toContain("one producer");
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
