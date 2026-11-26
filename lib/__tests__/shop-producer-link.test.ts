import { describe, expect, it } from "vitest";

import {
  toHeaderProducerLinks,
  toShopProducerLinks,
} from "@/lib/shop/shop-producer-link";

describe("shop producer link payloads", () => {
  const full = {
    id: "1",
    handle: "arpaye",
    title: "Arpayé",
    displayName: null,
    description: "Wines from Arpayé in Beaujolais",
    shortDescription: { en: "long", sv: "lång" },
    certification: "organic_certified",
    certificationVerifiedUrl: null,
    updatedAt: "2026-11-26T00:00:00.000Z",
  };

  it("keeps only the name and handle for the header", () => {
    expect(toHeaderProducerLinks([full])).toEqual([
      { handle: "arpaye", title: "Arpayé" },
    ]);
  });

  it("keeps the filter label fields and drops descriptions", () => {
    expect(toShopProducerLinks([full])).toEqual([
      { handle: "arpaye", title: "Arpayé", displayName: null },
    ]);
  });
});
