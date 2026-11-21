import { describe, expect, it } from "vitest";

import {
  normalizeGuideWineName,
  stripLeadingProducerFromBold,
  wineNameParts,
} from "@/lib/guides/systembolaget-ranked-list";
import type { SystembolagetGuideWine } from "@/lib/systembolaget/guide-wines";

function wine(
  partial: Pick<
    SystembolagetGuideWine,
    "product_number" | "producer_name" | "name_bold" | "name_thin"
  >,
): SystembolagetGuideWine {
  return partial as SystembolagetGuideWine;
}

describe("normalizeGuideWineName", () => {
  it("lowercases, trims, strips accents and punctuation", () => {
    expect(normalizeGuideWineName("  Descendientes de J. Palacios  ")).toBe(
      "descendientes de j palacios",
    );
    expect(normalizeGuideWineName("Éric Texier")).toBe("eric texier");
    expect(normalizeGuideWineName("Grüner Veltliner")).toBe("gruner veltliner");
  });

  it("collapses whitespace after removing punctuation", () => {
    expect(normalizeGuideWineName("Mas  Bertran")).toBe("mas bertran");
    expect(normalizeGuideWineName("J.Palacios")).toBe("jpalacios");
  });
});

describe("stripLeadingProducerFromBold", () => {
  it("removes a leading producer_name from name_bold", () => {
    expect(stripLeadingProducerFromBold("Meinklang Naken", "Meinklang")).toBe(
      "Naken",
    );
    expect(
      stripLeadingProducerFromBold("Mas Bertran Sumollista", "Mas Bertran"),
    ).toBe("Sumollista");
  });

  it("returns null when bold is only the producer", () => {
    expect(stripLeadingProducerFromBold("Radikon", "Radikon")).toBeNull();
  });

  it("leaves bold unchanged when it does not start with the producer", () => {
    expect(stripLeadingProducerFromBold("Pétalos", "Descendientes de J Palacios")).toBe(
      "Pétalos",
    );
  });
});

describe("wineNameParts — Systembolaget cases", () => {
  it("7036101 Meinklang: strips leading producer from bold, keeps thin", () => {
    const parts = wineNameParts(
      wine({
        product_number: "7036101",
        producer_name: "Meinklang",
        name_bold: "Meinklang Naken",
        name_thin: "Grüner Veltliner",
      }),
    );
    expect(parts).toEqual({
      producer: "Meinklang",
      secondary: "Naken Grüner Veltliner",
    });
  });

  it("7576201 Mas Bertran: strips leading producer; hides thin already in bold", () => {
    const parts = wineNameParts(
      wine({
        product_number: "7576201",
        producer_name: "Mas Bertran",
        name_bold: "Mas Bertran Sumollista",
        name_thin: "Sumollista",
      }),
    );
    expect(parts).toEqual({
      producer: "Mas Bertran",
      secondary: "Sumollista",
    });
  });

  it("9435901 Palacios: hides thin equal to producer after punctuation normalize", () => {
    const parts = wineNameParts(
      wine({
        product_number: "9435901",
        producer_name: "Descendientes de J Palacios",
        name_bold: "Pétalos",
        name_thin: "Descendientes de J. Palacios",
      }),
    );
    expect(parts).toEqual({
      producer: "Descendientes de J Palacios",
      secondary: "Pétalos",
    });
  });

  it("5139901 Henriquez: hides thin that is a near-duplicate producer typo", () => {
    const parts = wineNameParts(
      wine({
        product_number: "5139901",
        producer_name: "Roberto Henriquez",
        name_bold: "Tierra del Pumas",
        name_thin: "Roberto Henrquez",
      }),
    );
    expect(parts).toEqual({
      producer: "Roberto Henriquez",
      secondary: "Tierra del Pumas",
    });
  });

  it("drops name_bold that only restates part of the producer", () => {
    const parts = wineNameParts(
      wine({
        product_number: "1",
        producer_name: "Mgr. Petr Korab",
        name_bold: "Petr Korab",
        name_thin: "Orange on Leaves Pet Nat",
      }),
    );
    expect(parts).toEqual({
      producer: "Mgr. Petr Korab",
      secondary: "Orange on Leaves Pet Nat",
    });
  });
});
