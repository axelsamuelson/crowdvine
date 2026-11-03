import { describe, expect, it } from "vitest";

import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { top100ProducerShopLinkFromRow } from "@/lib/guides/top-100-producer-shop-links";

const MAPPED: Record<string, string> = {
  "Jean-François Ganevat": "99feb2f6-cca3-4296-b111-87af8f117193",
  "Clos Rougeard (Foucault)": "eec91ce5-35f6-4f10-b5bf-75af1938b941",
  "Jean Foillard": "77606e79-786f-47d8-9d6a-3cf808c662c4",
  "Hervé Souhaut / Romaneaux-Destezet": "06f72a9c-cf60-4019-9bf9-3cb5271fcefe",
  "Guy Breton": "133f8561-e005-45ed-b1ed-4d9b796f5e47",
  "Domaine Gauby / Gérard & Lionel Gauby": "561f49c8-a2a2-4bf4-8d59-92501c33ebc8",
  "Didier Barral / Domaine Léon Barral": "f54d6a0e-d424-4699-b332-4c3dcd9c62cd",
  "Sylvain Pataille": "c061c27f-08da-4822-b3fa-c9fba6caa47a",
};

describe("top 100 producer shop links", () => {
  it("sets producerId only on the eight exact guide names", () => {
    for (const [name, producerId] of Object.entries(MAPPED)) {
      const matches = TOP_100_PRODUCERS.filter((producer) => producer.name === name);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.producerId).toBe(producerId);
    }

    const mapped = TOP_100_PRODUCERS.filter((producer) => producer.producerId);
    expect(mapped).toHaveLength(8);
    expect(mapped.map((producer) => producer.name).sort()).toEqual(
      Object.keys(MAPPED).sort(),
    );
  });

  it("uses display_name in the label and the legal name in the slug", () => {
    expect(
      top100ProducerShopLinkFromRow("sv", {
        name: "Domaine Romaneaux-Destezet",
        displayName: "Hervé Souhaut",
        hasLiveWine: true,
      }),
    ).toEqual({
      href: "/producenter/domaine-romaneaux-destezet",
      label: "Viner från Hervé Souhaut hos PACT",
    });

    expect(
      top100ProducerShopLinkFromRow("en", {
        name: "SAS Anne et Jean-François Ganevat",
        displayName: null,
        hasLiveWine: true,
      }),
    ).toEqual({
      href: "/producers/sas-anne-et-jean-francois-ganevat",
      label: "SAS Anne et Jean-François Ganevat wines at PACT",
    });
  });

  it("omits producers with no live wine", () => {
    expect(
      top100ProducerShopLinkFromRow("sv", {
        name: "Clos Rougeard",
        displayName: null,
        hasLiveWine: false,
      }),
    ).toBeNull();
  });
});
