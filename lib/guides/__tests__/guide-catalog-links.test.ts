import { describe, expect, it } from "vitest";

import {
  guideProducerSlugForTopWine,
  matchGuideWineToPdpHandle,
} from "@/lib/guides/guide-catalog-links";

describe("guide catalog link matching", () => {
  it("slugs a top wine producer from topProducerName", () => {
    expect(
      guideProducerSlugForTopWine({
        producer: "Foillard",
        topProducerName: "Jean Foillard",
      }),
    ).toBe("jean-foillard");
  });

  it("matches an exact cuvée name on the same producer", () => {
    const handle = matchGuideWineToPdpHandle(
      {
        wine: "Morgon Classique",
        producer: "Jean Foillard",
        topProducerName: "Jean Foillard",
      },
      [
        {
          handle: "morgon-classique-2023",
          wine_name: "Morgon Classique",
          producer_slug: "jean-foillard",
          producer_id: null,
        },
        {
          handle: "alizes-2023",
          wine_name: "Alizés",
          producer_slug: "jean-foillard",
          producer_id: null,
        },
      ],
    );
    expect(handle).toBe("morgon-classique-2023");
  });

  it("does not match a short ambiguous Morgon label to another cuvée", () => {
    const handle = matchGuideWineToPdpHandle(
      {
        wine: "Morgon",
        producer: "Jean Foillard",
        topProducerName: "Jean Foillard",
      },
      [
        {
          handle: "morgon-classique-2023",
          wine_name: "Morgon Classique",
          producer_slug: "jean-foillard",
          producer_id: null,
        },
      ],
    );
    expect(handle).toBeNull();
  });
});
