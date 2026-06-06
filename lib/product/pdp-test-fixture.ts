import type { Product, WineEnrichment } from "@/lib/shopify/types";

/** Au Mas label in Supabase storage (fallback when live fetch fails). */
export const AU_MAS_LABEL_IMAGE =
  "https://abrnvjqwpdkodgrtezeg.supabase.co/storage/v1/object/public/uploads/d91939f0-b65f-46ca-88b1-e7d2de0a452a.png";

export const AU_MAS_WINE_ID = "27331cda-83fd-4705-a698-af98b5b4de49";
export const AU_MAS_PRODUCER_ID = "fd15c5c2-c8ef-4199-a1b2-223a4466ed5f";
export const AU_MAS_HANDLE = "au-mas-2024";

/** Full enrichment — mirrors Au Mas (27331cda…) test data. */
export const PDP_TEST_ENRICHMENT_FULL: WineEnrichment = {
  tasting_notes:
    "Carignan, Cinsault, Grenache och Syrah på galets roulés. Fruktig, rund och lättdrickbar — klassisk medelhavskaraktär utan tyngd. Mas d'Agalis vardagsvin.",
  appellation: "Vin de France",
  farming: "organic_certified",
  additives: "Inga tillsatta sulfiter",
  serving_temp_c: "13–15",
  abv: "13.5",
  food_pairing: ["pizza", "pasta", "grillad kyckling"],
  soil_type: "Galets roulés",
  elevation_masl: 120,
  ageing: "12 månader på tank, 6 månader på flaska",
  winemaker_notes:
    "Ett vardagsvin som vi dricker själva vid bordet — fruktigt, okomplicerat och alltid i kylskåpet.",
  awards: ["Medaille d'Or", "Concours Général Agricole 2024", "Guide Hachette"],
  grapeVarieties: ["Carignan", "Cinsault", "Grenache", "Syrah"],
  color: "Red",
};

/** Sparse enrichment — only a few fields; rest should not render. */
export const PDP_TEST_ENRICHMENT_MINIMAL: WineEnrichment = {
  appellation: "Languedoc",
  grapeVarieties: ["Grenache"],
  serving_temp_c: "16",
};

function buildAuMasImage(alt: string) {
  return {
    id: "au-mas-label",
    url: AU_MAS_LABEL_IMAGE,
    altText: alt,
    width: 600,
    height: 600,
  };
}

function buildTestProduct(
  enrichment: WineEnrichment,
  overrides?: Partial<Product>,
): Product & { productType: string } {
  const grapes = enrichment.grapeVarieties ?? [];
  return {
    id: AU_MAS_WINE_ID,
    title: "Au Mas 2024",
    handle: AU_MAS_HANDLE,
    productType: "wine",
    description:
      "Ett fruktigt och lättdrickbart rödvin från Mas d'Agalis i Languedoc.",
    descriptionHtml:
      "<p>Ett fruktigt och lättdrickbart rödvin från Mas d'Agalis i Languedoc. Perfekt till vardagsmat.</p>",
    summary: "Frisk, fruktig och lättdrickbar — vardagsvin från Languedoc.",
    producerName: "Mas d'Agalis",
    producerId: AU_MAS_PRODUCER_ID,
    producerBoostActive: false,
    availableForSale: true,
    currencyCode: "SEK",
    wineEnrichment: enrichment,
    featuredImage: buildAuMasImage("Au Mas 2024"),
    images: [buildAuMasImage("Au Mas 2024")],
    priceRange: {
      minVariantPrice: { amount: "149", currencyCode: "SEK" },
      maxVariantPrice: { amount: "149", currencyCode: "SEK" },
    },
    options: [
      {
        id: "grape-varieties",
        name: "Grape Varieties",
        values: grapes.map((name) => ({
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
        })),
      },
      {
        id: "color",
        name: "Color",
        values: [{ id: "red", name: "Red" }],
      },
    ],
    variants: [
      {
        id: AU_MAS_WINE_ID,
        title: "750 ml",
        availableForSale: true,
        price: { amount: "149", currencyCode: "SEK" },
        selectedOptions: [
          ...grapes.map((g) => ({ name: "Grape Varieties", value: g })),
          { name: "Color", value: "Red" },
        ],
      },
    ],
    tags: [...grapes, "Red"],
    seo: { title: "Au Mas 2024", description: grapes.join(", ") },
    b2bStock: 48,
    priceBreakdown: {
      costAmount: 45,
      exchangeRate: 11.2,
      alcoholTaxCents: 2219,
      marginPercentage: 10,
      basePriceCents: 14900,
      b2bMarginPercentage: 8,
      b2bShippingPerBottleSek: 12,
      b2bPriceExclVat: 89,
    },
    ...overrides,
  };
}

export type PdpTestFixtureId = "full" | "minimal" | "summary-only";

export function getPdpTestFixture(id: PdpTestFixtureId): Product & {
  productType: string;
} {
  switch (id) {
    case "minimal":
      return buildTestProduct(PDP_TEST_ENRICHMENT_MINIMAL, {
        summary: "Minimal fixture — bara appellation, druvsort och serveringstemp.",
        descriptionHtml: "<p>Lång beskrivning visas här under variantväljaren.</p>",
      });
    case "summary-only":
      return buildTestProduct({}, {
        summary: "Endast summary — inga enrichment-fält ska synas under.",
        wineEnrichment: {},
        options: [
          {
            id: "color",
            name: "Color",
            values: [{ id: "red", name: "Red" }],
          },
        ],
        variants: [
          {
            id: AU_MAS_WINE_ID,
            title: "750 ml",
            availableForSale: true,
            price: { amount: "149", currencyCode: "SEK" },
            selectedOptions: [{ name: "Color", value: "Red" }],
          },
        ],
      });
    case "full":
    default:
      return buildTestProduct(PDP_TEST_ENRICHMENT_FULL);
  }
}

export const PDP_TEST_FIXTURES: { id: PdpTestFixtureId; label: string }[] = [
  { id: "full", label: "Full (Au Mas)" },
  { id: "minimal", label: "Minimal" },
  { id: "summary-only", label: "Summary only" },
];
