import { describe, expect, it } from "vitest";

import {
  buildWineRegionFaq,
  buildWineRegionFaqPageJsonLd,
} from "@/lib/wine-region-faq";
import { wineRegionBySlug } from "@/lib/wine-regions";

const loire = wineRegionBySlug("loire")!;

describe("buildWineRegionFaq", () => {
  it("builds 3–4 factual SV Q&As with plain customer wording", () => {
    const faq = buildWineRegionFaq(loire, "sv", {
      wineCount: 5,
      producerCount: 2,
      producerNames: ["Domaine A", "Domaine B"],
      grapeLabels: ["Chenin Blanc", "Cabernet Franc"],
      styleLabels: ["Vitt", "Rött"],
    });
    expect(faq.length).toBeGreaterThanOrEqual(3);
    expect(faq.length).toBeLessThanOrEqual(4);
    expect(faq[0]?.question).toContain("Loire");
    expect(faq[0]?.answer).toBe(
      "Just nu finns 5 viner från 2 producenter hos PACT.",
    );
    const blob = faq.map((f) => `${f.question} ${f.answer}`).join("\n");
    expect(blob.toLowerCase()).not.toContain("systembolaget");
    expect(blob.toLowerCase()).not.toContain("bästa");
    expect(blob.toLowerCase()).not.toContain("köp");
    expect(blob.toLowerCase()).not.toContain("grossist");
    expect(blob.toLowerCase()).not.toContain("live");
  });

  it("builds EN FAQ without delivery promises, kr, or live jargon", () => {
    const faq = buildWineRegionFaq(loire, "en", {
      wineCount: 3,
      producerCount: 1,
      producerNames: ["Domaine A"],
      grapeLabels: ["Chenin Blanc"],
      styleLabels: ["White"],
    });
    expect(faq[0]?.answer).toBe(
      "PACT currently has 3 wines from 1 producer.",
    );
    const blob = faq.map((f) => `${f.question} ${f.answer}`).join("\n");
    expect(blob.toLowerCase()).not.toContain("budbee");
    expect(blob.toLowerCase()).not.toContain("delivery");
    expect(blob.toLowerCase()).not.toContain("kr");
    expect(blob.toLowerCase()).not.toContain("best");
    expect(blob.toLowerCase()).not.toContain("buy");
    expect(blob.toLowerCase()).not.toContain("live");
  });

  it("emits FAQPage JSON-LD", () => {
    const faq = buildWineRegionFaq(loire, "en", {
      wineCount: 2,
      producerCount: 1,
      producerNames: ["A"],
      grapeLabels: ["Chenin"],
      styleLabels: ["White"],
    });
    const json = buildWineRegionFaqPageJsonLd(faq);
    expect(json["@type"]).toBe("FAQPage");
    expect(json.mainEntity).toHaveLength(faq.length);
    expect(json.mainEntity[0]?.["@type"]).toBe("Question");
  });
});
