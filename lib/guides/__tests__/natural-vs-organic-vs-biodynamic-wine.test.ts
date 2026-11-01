import { describe, expect, it } from "vitest";

import {
  LABEL_COMPARISON_COLUMNS,
  LABEL_COMPARISON_ROWS,
  NATURAL_VS_ORGANIC_PATH,
  NATURAL_VS_ORGANIC_UPDATED,
  naturalVsOrganicAuthor,
  naturalVsOrganicFaqs,
  naturalVsOrganicMeta,
  naturalVsOrganicProducerGroups,
} from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";
import { guideCopy } from "@/lib/guides/guide-copy";
import { switchGuidePath } from "@/lib/guides/switch-guide-path";

describe("natural vs organic vs biodynamic wine guide", () => {
  it("keeps draft meta title and description", () => {
    expect(naturalVsOrganicMeta.title).toBe(
      "Natural vs Organic vs Biodynamic Wine: What the Labels Mean | PACT",
    );
    expect(naturalVsOrganicMeta.description).toBe(
      "Natural vs organic wine, organic vs biodynamic: how EU organic, USDA organic, Demeter and Vin Méthode Nature differ on farming, additives and sulfites.",
    );
    expect(naturalVsOrganicMeta.description.length).toBeLessThanOrEqual(160);
    expect(NATURAL_VS_ORGANIC_PATH).toBe(
      "/guides/natural-vs-organic-vs-biodynamic-wine",
    );
    expect(NATURAL_VS_ORGANIC_UPDATED).toBe("2026-11-01");
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

  it("lists producer groups without prices or shop CTAs", () => {
    expect(naturalVsOrganicProducerGroups.map((g) => g.heading)).toEqual([
      "Certified biodynamic",
      "Certified organic",
      "Natural, not certified",
    ]);
    const blob = JSON.stringify(naturalVsOrganicProducerGroups);
    expect(blob).not.toMatch(/kr|SEK|€|\$|buy|shop|price/i);
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
