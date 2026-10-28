import { describe, expect, it } from "vitest";

import { buildItemListJsonLd } from "@/lib/guides/systembolaget-ranked-list";
import type { SystembolagetGuideWine } from "@/lib/systembolaget/guide-wines";

const sampleWine = {
  product_number: "1234567",
  producer_name: "Test Producer",
  name_bold: "Cuvée",
  name_thin: "Rouge",
  price: 149,
  image_url: "https://example.com/wine.jpg",
} as SystembolagetGuideWine;

describe("buildItemListJsonLd", () => {
  it("emits ItemList without Product or Offer commerce schema", () => {
    const jsonLd = buildItemListJsonLd(
      [sampleWine],
      "https://pactwines.com/guider/basta-naturvinerna-pa-systembolaget",
      "Naturvin på Systembolaget",
    );

    expect(jsonLd["@type"]).toBe("ItemList");
    expect(jsonLd.numberOfItems).toBe(1);

    const serialized = JSON.stringify(jsonLd);
    expect(serialized).not.toContain('"Product"');
    expect(serialized).not.toContain('"Offer"');
    expect(serialized).not.toContain("priceCurrency");
    expect(serialized).not.toContain("InStock");

    const element = jsonLd.itemListElement[0] as {
      "@type": string;
      position: number;
      name: string;
      url: string;
    };
    expect(element["@type"]).toBe("ListItem");
    expect(element.position).toBe(1);
    expect(element.name).toBeTruthy();
    expect(element.url).toContain("systembolaget.se");
  });
});
