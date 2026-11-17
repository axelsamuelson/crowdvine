import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  LABEL_COMPARISON_COLUMNS,
  LABEL_COMPARISON_ROWS,
  NATURAL_VS_ORGANIC_PATH,
  NATURAL_VS_ORGANIC_UPDATED,
  naturalVsOrganicAuthor,
  naturalVsOrganicFaqs,
  naturalVsOrganicMeta,
} from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";
import { guideCopy } from "@/lib/guides/guide-copy";
import { switchGuidePath } from "@/lib/guides/switch-guide-path";

describe("natural vs organic vs biodynamic wine guide", () => {
  it("keeps SEO meta title and description", () => {
    // Template would append " | PACT Wines", so title keeps " | PACT" absolute.
    expect(naturalVsOrganicMeta.title).toBe(
      "Natural vs Organic Wine (and Biodynamic) Explained | PACT",
    );
    expect(naturalVsOrganicMeta.description).toBe(
      "Natural vs organic wine vs biodynamic: how USDA organic, EU organic, Demeter and Vin Méthode Nature differ on farming, additives and sulfite limits.",
    );
    expect(naturalVsOrganicMeta.description.length).toBeLessThanOrEqual(160);
    expect(NATURAL_VS_ORGANIC_PATH).toBe(
      "/guides/natural-vs-organic-vs-biodynamic-wine",
    );
    expect(NATURAL_VS_ORGANIC_UPDATED).toBe("2026-11-07");
  });

  it("credits Axel Samuelson as founder for Person schema", () => {
    expect(naturalVsOrganicAuthor).toEqual({
      name: "Axel Samuelson",
      jobTitle: "Founder of PACT",
      byline: "By Axel Samuelson, founder of PACT",
    });
  });

  it("compares five labels across six rows", () => {
    expect(LABEL_COMPARISON_COLUMNS.map((c) => c.id)).toEqual([
      "eu-organic",
      "usda-organic",
      "usda-made-with",
      "demeter",
      "vmn",
    ]);
    expect(LABEL_COMPARISON_ROWS.map((r) => r.key)).toEqual([
      "grapes",
      "yeast",
      "additives",
      "addedSulfites",
      "maxSo2",
      "legalStatus",
    ]);
    expect(LABEL_COMPARISON_ROWS.find((r) => r.key === "maxSo2")?.label).toBe(
      "Max total SO₂ (dry still)",
    );
    expect(LABEL_COMPARISON_COLUMNS.map((c) => c.label)).toEqual([
      "EU organic",
      "USDA “organic”",
      "USDA “made with organic grapes”",
      "Biodynamic (Demeter France)",
      "Natural (Vin Méthode Nature)",
    ]);
  });

  it("lists FAQ questions from the draft", () => {
    expect(naturalVsOrganicFaqs.map((f) => f.question)).toEqual([
      "Is organic wine the same as natural wine?",
      "What is the difference between organic and biodynamic wine?",
      "Does organic wine contain sulfites?",
      "Is natural wine sulfite-free?",
      "How can I tell if a wine is natural?",
    ]);
  });

  it("keeps Our producers without a Languedoc-only claim or producer list", () => {
    const source = readFileSync(
      "lib/guides/render-natural-vs-organic-guide.tsx",
      "utf8",
    );
    expect(source).toContain("Our producers");
    expect(source.replace(/\s+/g, " ")).toContain(
      "For every wine we list the additives and sulfites the producer reports.",
    );
    expect(source).not.toContain("Languedoc");
    expect(source).not.toContain("Béziers");
    expect(source).not.toContain("naturalVsOrganicProducerGroups");
  });

  it("appears on the English guide hub only", () => {
    const en = guideCopy("en").hubSections.find((s) => s.title === "Guides");
    const sv = guideCopy("sv").hubSections.find((s) => s.title === "Guider");
    expect(en?.cards.some((c) => c.href === NATURAL_VS_ORGANIC_PATH)).toBe(
      true,
    );
    expect(sv?.cards.some((c) => c.href === NATURAL_VS_ORGANIC_PATH)).toBe(
      false,
    );
  });

  it("does not invent a Swedish twin when switching locale", () => {
    expect(switchGuidePath(NATURAL_VS_ORGANIC_PATH, "sv")).toBeNull();
    expect(switchGuidePath(NATURAL_VS_ORGANIC_PATH, "en")).toBeNull();
  });
});
