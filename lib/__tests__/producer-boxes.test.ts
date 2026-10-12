import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCER_BOXES,
  PRODUCER_BOXES_COPY,
  PRODUCER_BOXES_PUBLISHED,
  isProducerBoxesPath,
  pactProducerBoxesRedirectUrl,
  producerBoxesSitemapPaths,
} from "@/lib/producer-boxes/config";
import {
  catalogContainsEmDash,
  parseProducerBoxesCatalog,
  serializeProducerBoxesCatalog,
} from "@/lib/producer-boxes/catalog";
import {
  batchAddItems,
  normalizeCatalogName,
  resolveProducerBox,
  type ProducerBoxWineRow,
} from "@/lib/producer-boxes/match";

const producers = [
  { id: "p-mesures", name: "Mas Des Mesures" },
  { id: "p-marotte", name: "La Marotte" },
  { id: "p-fantine", name: "Clos Fantine" },
];

function wine(
  partial: Partial<ProducerBoxWineRow> & Pick<ProducerBoxWineRow, "id" | "producer_id" | "wine_name">,
): ProducerBoxWineRow {
  return {
    handle: "handle",
    color: "Red",
    vintage: "2023",
    base_price_cents: 10000,
    is_live: true,
    available_for_sale: true,
    ...partial,
  };
}

describe("producer boxes", () => {
  it("stays unpublished and out of the sitemap", () => {
    expect(PRODUCER_BOXES_PUBLISHED).toBe(false);
    expect(producerBoxesSitemapPaths()).toEqual([]);
  });

  it("keeps meta within 155 characters and names the offer factually", () => {
    expect(PRODUCER_BOXES_COPY.sv.meta.length).toBeLessThanOrEqual(155);
    expect(PRODUCER_BOXES_COPY.en.meta.length).toBeLessThanOrEqual(155);
    expect(PRODUCER_BOXES_COPY.sv.meta.toLowerCase()).toContain("naturvin låda");
    expect(PRODUCER_BOXES_COPY.sv.meta).toContain("6 flaskor");
    expect(PRODUCER_BOXES_COPY.sv.meta).toContain("producent");
    expect(PRODUCER_BOXES_COPY.en.meta.toLowerCase()).toContain("natural wine box");
    expect(PRODUCER_BOXES_COPY.en.meta).toContain("6 bottles");
    expect(PRODUCER_BOXES_COPY.en.meta.toLowerCase()).toContain("producer");
  });

  it("does not use em dashes in the default copy", () => {
    const blobs = [
      ...Object.values(PRODUCER_BOXES_COPY.sv),
      ...Object.values(PRODUCER_BOXES_COPY.en),
      ...DEFAULT_PRODUCER_BOXES.flatMap((box) => [
        box.story.sv,
        box.story.en,
        box.name.sv,
        ...box.wineNames,
      ]),
    ];
    for (const text of blobs) {
      expect(text).not.toContain("\u2014");
      expect(text).not.toContain("\u2013");
    }
    expect(catalogContainsEmDash(DEFAULT_PRODUCER_BOXES)).toBe(false);
  });

  it("matches accents and apostrophes, and does not extend a shorter name", () => {
    expect(normalizeCatalogName("Faugères Tradition")).toBe(
      normalizeCatalogName("Faugeres Tradition"),
    );
    expect(normalizeCatalogName("Nuit d'Orage")).toBe(
      normalizeCatalogName("Nuit d\u2019Orage"),
    );
    expect(normalizeCatalogName("Fantaisie Orange")).not.toBe(
      normalizeCatalogName("Fantaisie Orange 2024"),
    );
  });

  it("does not substitute a missing or unpublished wine", () => {
    const fantine = DEFAULT_PRODUCER_BOXES[2]!;
    const resolved = resolveProducerBox(
      fantine,
      producers,
      [
        wine({
          id: "tradition",
          producer_id: "p-fantine",
          wine_name: "Faugeres Tradition",
        }),
        wine({ id: "impro", producer_id: "p-fantine", wine_name: "Impro" }),
        wine({
          id: "lanterne",
          producer_id: "p-fantine",
          wine_name: "La Lanterne Rouge",
        }),
        wine({
          id: "nuit",
          producer_id: "p-fantine",
          wine_name: "Nuit d\u2019Orage",
        }),
        wine({
          id: "case",
          producer_id: "p-fantine",
          wine_name: "Une Case en Plus",
        }),
        wine({
          id: "other-orange",
          producer_id: "p-fantine",
          wine_name: "Fantaisie Orange 2024",
          is_live: true,
        }),
      ],
    );

    const orange = resolved.slots.find(
      (slot) => slot.configuredName === "Fantaisie Orange",
    );
    expect(orange?.status).toBe("missing");
    expect(orange?.wineId).toBeUndefined();
    expect(resolved.purchasable).toBe(false);
    expect(resolved.totalCents).toBeNull();
    expect(batchAddItems(resolved)).toBeNull();
  });

  it("keeps an unpublished exact match instead of a longer title", () => {
    const fantine = DEFAULT_PRODUCER_BOXES[2]!;
    const resolved = resolveProducerBox(fantine, producers, [
      wine({
        id: "draft",
        producer_id: "p-fantine",
        wine_name: "Fantaisie Orange",
        is_live: false,
      }),
      wine({
        id: "live-longer",
        producer_id: "p-fantine",
        wine_name: "Fantaisie Orange 2024",
      }),
    ]);
    const orange = resolved.slots.find(
      (slot) => slot.configuredName === "Fantaisie Orange",
    );
    expect(orange?.status).toBe("unpublished");
    expect(orange?.wineId).toBe("draft");
  });

  it("disables the box when a wine is not for sale", () => {
    const marotte = DEFAULT_PRODUCER_BOXES[1]!;
    const resolved = resolveProducerBox(
      marotte,
      producers,
      marotte.wineNames.map((name, index) =>
        wine({
          id: `m-${index}`,
          producer_id: "p-marotte",
          wine_name: name,
          available_for_sale: name !== "Sorcières",
          base_price_cents: 1000 * (index + 1),
        }),
      ),
    );
    expect(resolved.slots.find((slot) => slot.configuredName === "Sorcières")?.status).toBe(
      "not_for_sale",
    );
    expect(resolved.purchasable).toBe(false);
    expect(resolved.totalCents).toBe(21000);
    expect(batchAddItems(resolved)).toBeNull();
  });

  it("builds a six-bottle batch for a complete box", () => {
    const box = DEFAULT_PRODUCER_BOXES[0]!;
    const resolved = resolveProducerBox(
      box,
      producers,
      box.wineNames.map((name, index) =>
        wine({
          id: `w-${index}`,
          producer_id: "p-mesures",
          wine_name: name,
          base_price_cents: 100,
        }),
      ),
    );
    expect(resolved.purchasable).toBe(true);
    expect(batchAddItems(resolved)).toEqual(
      box.wineNames.map((_, index) => ({ variantId: `w-${index}`, quantity: 1 })),
    );
    expect(resolved.totalCents).toBe(600);
  });

  it("redirects dirtywine paths to pactwines.com", () => {
    expect(isProducerBoxesPath("/vin/naturvin-lada")).toBe(true);
    expect(isProducerBoxesPath("/wine/natural-wine-box")).toBe(true);
    expect(isProducerBoxesPath("/vin/wine-boxes")).toBe(false);
    expect(pactProducerBoxesRedirectUrl("/vin/naturvin-lada", "?x=1")).toBe(
      "https://pactwines.com/vin/naturvin-lada?x=1",
    );
  });

  it("round-trips the admin catalog", () => {
    const parsed = parseProducerBoxesCatalog(
      serializeProducerBoxesCatalog(DEFAULT_PRODUCER_BOXES),
    );
    expect(parsed?.map((box) => box.id)).toEqual([
      "mas-des-mesures",
      "la-marotte",
      "clos-fantine",
    ]);
    expect(parsed?.[2]?.wineNames[5]).toBe("Fantaisie Orange");
  });
});
