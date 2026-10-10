import { describe, expect, it } from "vitest";
import { BILINGUAL_ARTICLE_GUIDES } from "@/lib/guides/bilingual-article-guides";
import { BILINGUAL_GUIDE_SLUG_PAIRS } from "@/lib/guides/bilingual-guide-slug-pairs";
import { switchGuidePath } from "@/lib/guides/switch-guide-path";

describe("BILINGUAL_GUIDE_SLUG_PAIRS", () => {
  it("matches BILINGUAL_ARTICLE_GUIDES slugs", () => {
    const fromArticles = BILINGUAL_ARTICLE_GUIDES.map((g) => ({
      en: g.slug.en,
      sv: g.slug.sv,
    }));
    expect([...BILINGUAL_GUIDE_SLUG_PAIRS]).toEqual(fromArticles);
  });
});

describe("switchGuidePath", () => {
  it("switches glouglou SV → EN", () => {
    expect(
      switchGuidePath("/guider/basta-glouglou-viner-systembolaget", "en"),
    ).toBe("/guides/best-glou-glou-wines-systembolaget");
  });

  it("switches glouglou EN → SV", () => {
    expect(
      switchGuidePath("/guides/best-glou-glou-wines-systembolaget", "sv"),
    ).toBe("/guider/basta-glouglou-viner-systembolaget");
  });

  it("switches hub", () => {
    expect(switchGuidePath("/guider", "en")).toBe("/guides");
    expect(switchGuidePath("/guides", "sv")).toBe("/guider");
  });

  it("returns null when already on target locale", () => {
    expect(
      switchGuidePath("/guides/best-glou-glou-wines-systembolaget", "en"),
    ).toBeNull();
  });
});
