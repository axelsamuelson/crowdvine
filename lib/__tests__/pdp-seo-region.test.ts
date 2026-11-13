import { describe, expect, it } from "vitest";

import {
  buildPdpSeoDescription,
  pdpSeoRegion,
} from "@/lib/crowdvine/product-by-handle-data";

describe("pdpSeoRegion", () => {
  it("prefers the wine region and falls back to the producer", () => {
    expect(pdpSeoRegion("Rhône", "Languedoc")).toBe("Rhône");
    expect(pdpSeoRegion("  ", "Champagne")).toBe("Champagne");
    expect(pdpSeoRegion(null, null)).toBeNull();
  });
});

describe("buildPdpSeoDescription", () => {
  const lead = "Ett friskt rött.";

  it("names the resolved region and omits the clause when there is none", () => {
    expect(
      buildPdpSeoDescription("sv", {
        summaryText: lead,
        tastingNotesText: null,
        grapeVarieties: [],
        producerName: "Hervé Souhaut",
        region: "Rhône",
      }),
    ).toBe(
      "Ett friskt rött. Naturvin från Hervé Souhaut, Rhône. Hemleverans i Sverige.",
    );
    expect(
      buildPdpSeoDescription("en", {
        summaryText: "A fresh red.",
        tastingNotesText: null,
        grapeVarieties: [],
        producerName: "Hervé Souhaut",
        region: "Champagne",
      }),
    ).toBe(
      "A fresh red. Natural wine from Hervé Souhaut, Champagne. Home delivery in Sweden.",
    );
    expect(
      buildPdpSeoDescription("sv", {
        summaryText: lead,
        tastingNotesText: null,
        grapeVarieties: [],
        producerName: "Hervé Souhaut",
        region: null,
      }),
    ).toBe("Ett friskt rött. Naturvin från Hervé Souhaut. Hemleverans i Sverige.");
  });
});
