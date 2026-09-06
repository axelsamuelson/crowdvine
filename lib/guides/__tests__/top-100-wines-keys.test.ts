import { describe, expect, it } from "vitest";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";

describe("TOP_100_WINES.topProducerName", () => {
  const producerNames = new Set(TOP_100_PRODUCERS.map((p) => p.name));

  it("every defined topProducerName resolves to an existing TOP_100_PRODUCERS name", () => {
    const bad: Array<{ rank: number; wine: string; topProducerName: string }> =
      [];

    for (const wine of TOP_100_WINES) {
      if (wine.topProducerName == null || wine.topProducerName === "") continue;
      if (!producerNames.has(wine.topProducerName)) {
        bad.push({
          rank: wine.rank,
          wine: wine.wine,
          topProducerName: wine.topProducerName,
        });
      }
    }

    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });

  it("fails when a typo'd topProducerName is introduced", () => {
    const fake = {
      ...TOP_100_WINES[0],
      topProducerName: "Not A Real Producer Name XYZ",
    };
    expect(producerNames.has(fake.topProducerName!)).toBe(false);
  });
});
