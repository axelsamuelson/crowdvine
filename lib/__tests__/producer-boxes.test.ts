import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCER_BOXES,
  PRODUCER_BOXES_COPY,
  PRODUCER_BOXES_FAQ,
  PRODUCER_BOXES_PUBLISHED,
  isProducerBoxesPath,
  pactProducerBoxesRedirectUrl,
  producerBoxesSitemapPaths,
  type ProducerBoxDefinition,
  type ProducerBoxLine,
} from "@/lib/producer-boxes/config";
import {
  catalogContainsEmDash,
  parseProducerBoxesCatalog,
  serializeProducerBoxesCatalog,
} from "@/lib/producer-boxes/catalog";
import {
  batchAddItems,
  linesAreSixBottles,
  resolveProducerBox,
  type ProducerBoxWineRow,
} from "@/lib/producer-boxes/match";
import { producerBoxContentsLine } from "@/lib/producer-boxes/contents-line";
import { buildProducerBoxesJsonLd } from "@/lib/producer-boxes/metadata";
import { getShopLayoutResultsCount } from "@/lib/shop/shop-results-count-server";

const FANTAISIE_ORANGE_2024 = "61a8806b-2771-4c0b-9572-4a1afee268ab";
const LA_PLAGE = "68180a1e-2da7-40d7-81aa-02ecf2450e67";
const POUCET = "1303dae7-927b-4664-b82d-057c2c38a33b";
const GRENADE = "6bb433b2-d27b-466f-8b13-87e57e2304f9";
const HIPPIE_KILLER = "523f6b93-8eaf-48f2-ad62-0cdddbb757b4";

const producers = [
  { id: "p-mesures", name: "Mas Des Mesures" },
  { id: "p-marotte", name: "La Marotte" },
  { id: "p-fantine", name: "Clos Fantine" },
  { id: "p-ranq", name: "Château del Ranq" },
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

function winesFor(box: ProducerBoxDefinition, producerId: string): ProducerBoxWineRow[] {
  return box.lines.map((line) =>
    wine({
      id: line.wineId,
      producer_id: producerId,
      wine_name: line.wineId,
      base_price_cents: 100,
    }),
  );
}

describe("producer boxes", () => {
  it("is published and listed on the pact sitemap", () => {
    expect(PRODUCER_BOXES_PUBLISHED).toBe(true);
    expect(producerBoxesSitemapPaths()).toEqual([
      "/vin/naturvin-lada",
      "/wine/natural-wine-box",
    ]);
  });

  it("keeps meta within 155 characters and names the offer factually", () => {
    expect(PRODUCER_BOXES_COPY.sv.title).toBe(
      "Naturvin låda: vinlåda med 6 flaskor från en gård",
    );
    expect(PRODUCER_BOXES_COPY.sv.h1).toBe(
      "Naturvinslåda: sex flaskor från en producent",
    );
    expect(PRODUCER_BOXES_COPY.sv.meta).toBe(
      "Vinlåda med naturvin: sex flaskor från en och samma producent i Languedoc. Se vad som ingår i varje låda och lägg hela lådan i varukorgen.",
    );
    expect(PRODUCER_BOXES_COPY.sv.meta.length).toBeLessThanOrEqual(155);
    expect(PRODUCER_BOXES_COPY.sv.intro.startsWith(
      "En naturvinslåda hos PACT är en vinlåda med sex flaskor från samma producent i Languedoc.",
    )).toBe(true);
    expect(PRODUCER_BOXES_FAQ.sv[0]?.answer).toBe(
      "En vinlåda med sex flaskor naturvin från samma producent, sammansatt av PACT.",
    );
    expect(PRODUCER_BOXES_COPY.en.meta.length).toBeLessThanOrEqual(155);
    expect(PRODUCER_BOXES_COPY.en.meta.toLowerCase()).toContain("natural wine box");
    expect(PRODUCER_BOXES_COPY.en.meta).toContain("six bottles");
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
        box.producerName,
      ]),
    ];
    for (const text of blobs) {
      expect(text).not.toContain("\u2014");
      expect(text).not.toContain("\u2013");
    }
    expect(catalogContainsEmDash(DEFAULT_PRODUCER_BOXES)).toBe(false);
  });

  it("lists six boxes and resolves the replaced wines by id", () => {
    expect(DEFAULT_PRODUCER_BOXES.map((box) => box.id)).toEqual([
      "mas-des-mesures",
      "la-marotte",
      "clos-fantine",
      "chateau-del-ranq",
      "hors-saison",
      "le-bouc-a-trois-pattes",
    ]);
    const fantine = DEFAULT_PRODUCER_BOXES[2]!;
    const marotte = DEFAULT_PRODUCER_BOXES[1]!;
    expect(fantine.lines.some((line) => line.wineId === FANTAISIE_ORANGE_2024)).toBe(true);
    expect(marotte.lines.some((line) => line.wineId === LA_PLAGE)).toBe(true);
    expect(marotte.lines.some((line) => line.wineId === "5ed54ddd-8451-42f8-ae92-04cb9cc08671")).toBe(
      false,
    );
    expect(DEFAULT_PRODUCER_BOXES[3]!.lines.find((line) => line.wineId === POUCET)?.quantity).toBe(2);
    expect(DEFAULT_PRODUCER_BOXES[4]!.lines.find((line) => line.wineId === GRENADE)?.quantity).toBe(2);
    expect(
      DEFAULT_PRODUCER_BOXES[5]!.lines.find((line) => line.wineId === HIPPIE_KILLER)?.quantity,
    ).toBe(2);
    for (const box of DEFAULT_PRODUCER_BOXES) {
      expect(linesAreSixBottles(box.lines)).toBe(true);
    }
  });

  it("matches Fantaisie Orange 2024 by id and prices the doubled bottle", () => {
    const fantine = DEFAULT_PRODUCER_BOXES[2]!;
    const prices = [17200, 17700, 14900, 16200, 17700, 20600];
    const resolved = resolveProducerBox(
      fantine,
      producers,
      fantine.lines.map((line, index) =>
        wine({
          id: line.wineId,
          producer_id: "p-fantine",
          wine_name: index === 5 ? "Fantaisie Orange 2024" : `wine-${index}`,
          vintage: "2024",
          base_price_cents: prices[index],
        }),
      ),
    );
    const orange = resolved.slots.find((slot) => slot.wineId === FANTAISIE_ORANGE_2024);
    expect(orange?.status).toBe("ok");
    expect(orange?.wineName).toBe("Fantaisie Orange 2024");
    expect(resolved.purchasable).toBe(true);
    expect(resolved.totalCents).toBe(104300);
  });

  it("leaves a missing wine id out of the total", () => {
    const box = DEFAULT_PRODUCER_BOXES[0]!;
    const resolved = resolveProducerBox(box, producers, winesFor(box, "p-mesures").slice(0, 5));
    expect(resolved.slots.at(-1)?.status).toBe("missing");
    expect(resolved.purchasable).toBe(false);
    expect(resolved.totalCents).toBeNull();
    expect(batchAddItems(resolved)).toBeNull();
  });

  it("disables the box when a wine is not for sale but still sums the list prices", () => {
    const box = DEFAULT_PRODUCER_BOXES[0]!;
    const resolved = resolveProducerBox(
      box,
      producers,
      winesFor(box, "p-mesures").map((row, index) => ({
        ...row,
        available_for_sale: index !== 2,
        base_price_cents: 1000,
      })),
    );
    expect(resolved.slots[2]?.status).toBe("not_for_sale");
    expect(resolved.purchasable).toBe(false);
    expect(resolved.totalCents).toBe(6000);
    expect(batchAddItems(resolved)).toBeNull();
  });

  it("sends quantity 2 for a repeated wine and doubles that price", () => {
    const ranq = DEFAULT_PRODUCER_BOXES[3]!;
    const resolved = resolveProducerBox(
      ranq,
      producers,
      winesFor(ranq, "p-ranq").map((row) => ({
        ...row,
        wine_name: row.id === POUCET ? "Poucèt" : "wine",
        base_price_cents: row.id === POUCET ? 19000 : 10000,
      })),
    );
    expect(resolved.purchasable).toBe(true);
    expect(resolved.slots).toHaveLength(5);
    expect(resolved.slots.find((slot) => slot.wineId === POUCET)?.quantity).toBe(2);
    expect(resolved.totalCents).toBe(10000 * 4 + 19000 * 2);
    expect(batchAddItems(resolved)).toEqual(
      ranq.lines.map((line) => ({ variantId: line.wineId, quantity: line.quantity })),
    );
  });

  it("rejects a box that is not exactly six bottles or mixes producers", () => {
    const tooMany: ProducerBoxLine[] = [{ wineId: "a", quantity: 7 }];
    expect(linesAreSixBottles(tooMany)).toBe(false);
    const box: ProducerBoxDefinition = {
      ...DEFAULT_PRODUCER_BOXES[0]!,
      lines: [
        { wineId: "a", quantity: 3 },
        { wineId: "b", quantity: 3 },
      ],
    };
    const resolved = resolveProducerBox(box, producers, [
      wine({ id: "a", producer_id: "p-mesures", wine_name: "A" }),
      wine({ id: "b", producer_id: "p-marotte", wine_name: "B" }),
    ]);
    expect(resolved.purchasable).toBe(false);
    expect(resolved.slots.every((slot) => slot.status === "producer_mismatch")).toBe(true);
    expect(batchAddItems(resolved)).toBeNull();
  });

  it("builds item list anchors for all six boxes", () => {
    const resolved = DEFAULT_PRODUCER_BOXES.map((definition) =>
      resolveProducerBox(definition, producers, winesFor(definition, "p-mesures")),
    );
    const jsonLd = buildProducerBoxesJsonLd("sv", resolved);
    expect(jsonLd.collection.mainEntity).toMatchObject({
      "@type": "ItemList",
      numberOfItems: 6,
    });
    const items = (
      jsonLd.collection.mainEntity as { itemListElement: { url: string }[] }
    ).itemListElement;
    expect(items.map((item) => item.url)).toEqual([
      "https://pactwines.com/vin/naturvin-lada#box-mas-des-mesures",
      "https://pactwines.com/vin/naturvin-lada#box-la-marotte",
      "https://pactwines.com/vin/naturvin-lada#box-clos-fantine",
      "https://pactwines.com/vin/naturvin-lada#box-chateau-del-ranq",
      "https://pactwines.com/vin/naturvin-lada#box-hors-saison",
      "https://pactwines.com/vin/naturvin-lada#box-le-bouc-a-trois-pattes",
    ]);
    const products = items as unknown as {
      item: { "@type": string; offers: { availability: string; price?: string } };
    }[];
    expect(products.every((entry) => entry.item["@type"] === "Product")).toBe(true);
    expect(
      products.every(
        (entry) =>
          entry.item.offers.availability === "https://schema.org/InStock" &&
          entry.item.offers.price != null,
      ),
    ).toBe(true);
    expect(jsonLd.faq["@type"]).toBe("FAQPage");
  });

  it("marks a box that is not for sale as out of stock", () => {
    const definition = DEFAULT_PRODUCER_BOXES[0]!;
    const resolved = resolveProducerBox(
      definition,
      producers,
      winesFor(definition, "p-mesures").map((row) => ({
        ...row,
        available_for_sale: false,
      })),
    );
    expect(resolved.purchasable).toBe(false);
    const jsonLd = buildProducerBoxesJsonLd("sv", [resolved]);
    const offer = (
      jsonLd.collection.mainEntity as {
        itemListElement: { item: { offers: { availability: string } } }[];
      }
    ).itemListElement[0]?.item.offers;
    expect(offer?.availability).toBe("https://schema.org/OutOfStock");
    expect(JSON.stringify(offer)).not.toContain("InStock");
  });

  it("describes each box from the listed wine types", () => {
    function slots(
      rows: { color: string; quantity?: number; wineName?: string; vintage?: string }[],
    ) {
      return rows.map((row) => ({
        wineId: row.wineName ?? row.color,
        quantity: row.quantity ?? 1,
        status: "ok" as const,
        color: row.color,
        wineName: row.wineName,
        vintage: row.vintage,
      }));
    }
    expect(
      producerBoxContentsLine(
        slots([
          { color: "Sparkling" },
          { color: "Rose" },
          { color: "White" },
          { color: "Orange" },
          { color: "Red" },
          { color: "Red" },
        ]),
        "sv",
      ),
    ).toBe(
      "Sex viner: ett mousserande, ett rosé, ett vitt, ett orange och två röda.",
    );
    expect(
      producerBoxContentsLine(
        slots([
          { color: "White", wineName: "Blanc de Noir", vintage: "2024" },
          { color: "Red" },
          { color: "Sparkling" },
          { color: "Red" },
          { color: "Red", quantity: 2, wineName: "Poucèt", vintage: "2024" },
        ]),
        "sv",
      ),
    ).toBe(
      "Fem viner, sex flaskor: ett vitt, tre röda och ett mousserande. Två av flaskorna är Poucèt 2024.",
    );
    expect(
      producerBoxContentsLine(
        slots([{ color: "Red" }, { color: "Red & White" }]),
        "sv",
      ),
    ).toBeNull();
    expect(
      producerBoxContentsLine(slots([{ color: "Red & Orange" }]), "sv"),
    ).toBeNull();
  });

  it("keeps faq answers free of savings, health and delivery claims", () => {
    const answers = PRODUCER_BOXES_FAQ.sv.map((item) => item.answer).join("\n");
    expect(answers).not.toMatch(/rabatt|bespar|hälsa|frakt|leveranstid/i);
    expect(PRODUCER_BOXES_FAQ.sv[4]?.link?.href).toBe("/villkor");
    for (const item of [...PRODUCER_BOXES_FAQ.sv, ...PRODUCER_BOXES_FAQ.en]) {
      expect(item.question).not.toMatch(/[—–]/);
      expect(item.answer).not.toMatch(/[—–]/);
    }
  });

  it("does not look up producer-box slugs as shop collections", async () => {
    await expect(
      getShopLayoutResultsCount("/vin/naturvin-lada", {}),
    ).resolves.toBeUndefined();
    await expect(
      getShopLayoutResultsCount("/wine/natural-wine-box", {}),
    ).resolves.toBeUndefined();
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
    expect(parsed?.map((box) => box.id)).toEqual(
      DEFAULT_PRODUCER_BOXES.map((box) => box.id),
    );
    expect(parsed?.[2]?.lines[5]).toEqual({
      wineId: FANTAISIE_ORANGE_2024,
      quantity: 1,
    });
    expect(parsed?.[3]?.lines[4]).toEqual({ wineId: POUCET, quantity: 2 });
  });
});
