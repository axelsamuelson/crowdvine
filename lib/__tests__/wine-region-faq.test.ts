import { describe, expect, it } from "vitest";

import {
  buildWineRegionFaq,
  buildWineRegionFaqPageJsonLd,
} from "@/lib/wine-region-faq";
import { wineRegionBySlug } from "@/lib/wine-regions";

const loire = wineRegionBySlug("loire")!;

describe("buildWineRegionFaq", () => {
  it("builds 3–4 factual SV Q&As from live facts", () => {
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
    expect(faq[0]?.answer).toContain("5");
    const blob = faq.map((f) => `${f.question} ${f.answer}`).join("\n");
    expect(blob.toLowerCase()).not.toContain("systembolaget");
    expect(blob.toLowerCase()).not.toContain("bästa");
    expect(blob.toLowerCase()).not.toContain("köp");
    expect(blob.toLowerCase()).not.toContain("grossist");
  });

  it("builds EN FAQ without delivery promises or kr", () => {
    const faq = buildWineRegionFaq(loire, "en", {
      wineCount: 3,
      producerCount: 1,
      producerNames: ["Domaine A"],
      grapeLabels: ["Chenin Blanc"],
      styleLabels: ["White"],
    });
    const blob = faq.map((f) => `${f.question} ${f.answer}`).join("\n");
    expect(blob.toLowerCase()).not.toContain("budbee");
    expect(blob.toLowerCase()).not.toContain("delivery");
    expect(blob.toLowerCase()).not.toContain("kr");
    expect(blob.toLowerCase()).not.toContain("best");
    expect(blob.toLowerCase()).not.toContain("buy");
    expect(faq.some((f) => f.answer.includes("3"))).toBe(true);
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
