import type { AppLocale } from "@/lib/i18n/locale";
import { PACT_CONFIG } from "@/lib/site-config";

/**
 * Public page. Sitemap and index follow this flag. Keep it in code so an
 * admin save of the wine list cannot unpublish the page.
 */
export const PRODUCER_BOXES_PUBLISHED = true;

export const PRODUCER_BOXES_CONTENT_KEY = "producer_boxes";

/** A box is six bottles from one producer. One wine can appear more than once. */
export const PRODUCER_BOX_BOTTLE_COUNT = 6;
export const PRODUCER_BOX_MAX_PER_WINE = 6;

export const PRODUCER_BOXES_PATH = {
  sv: "/vin/naturvin-lada",
  en: "/wine/natural-wine-box",
} as const;

export type ProducerBoxId =
  | "mas-des-mesures"
  | "la-marotte"
  | "clos-fantine"
  | "chateau-del-ranq"
  | "hors-saison"
  | "le-bouc-a-trois-pattes";

export interface ProducerBoxLine {
  wineId: string;
  quantity: number;
}

export interface ProducerBoxDefinition {
  id: ProducerBoxId;
  producerName: string;
  name: { sv: string; en: string };
  /** Two factual sentences. Placeholder until Sofia (GC) signs off. */
  story: { sv: string; en: string };
  /** Catalog wine ids. Quantities must sum to PRODUCER_BOX_BOTTLE_COUNT. */
  lines: readonly ProducerBoxLine[];
}

export const PRODUCER_BOXES_COPY = {
  sv: {
    title: "Naturvin låda: vinlåda med 6 flaskor från en gård",
    h1: "Naturvinslåda: sex flaskor från en producent",
    meta: "Vinlåda med naturvin: sex flaskor från en och samma producent i Languedoc. Se vad som ingår i varje låda och lägg hela lådan i varukorgen.",
    breadcrumb: "Naturvinlåda",
    boxesHeading: "Våra naturvinslådor",
    faqHeading: "Vanliga frågor",
    intro:
      "En naturvinslåda hos PACT är en vinlåda med sex flaskor från samma producent i Languedoc. Du lär känna en gård på djupet, med flera viner från samma händer och samma jordar. Lådorna är sammansatta av oss. Priset visas i kronor inklusive moms. Vill du hellre välja enskilda flaskor hittar du hela utbudet i butiken. Nytt för naturvin? Läs först vad naturvin är.",
    draft:
      "Utkast. Sidan är inte publicerad. Texten ska läsas av Sofia (GC) innan publicering.",
    producer: "Producent",
    wine: "Vin",
    type: "Typ",
    price: "Pris",
    total: "Summa",
    inclVat: "inkl. moms",
    add: "Lägg lådan i varukorgen",
    adding: "Lägger i varukorgen",
    added: "Tillagd. Varukorgen visar flaskorna var för sig.",
    unavailable: "Låda ej tillgänglig just nu",
    missing: "Hittades inte",
    unpublished: "Ej publicerad",
    notForSale: "Ej till salu",
    ambiguous: "Flera viner matchar namnet",
    wrongProducer: "Hör till en annan producent",
    producerMissing: "Producenten hittades inte",
    loadError: "Vinlistan kunde inte hämtas.",
  },
  en: {
    title: "Natural wine box: 6 bottles from one producer",
    h1: "Natural wine box: six bottles from one producer",
    meta: "A natural wine box of six bottles from one producer in Languedoc. See what each box contains and add the whole box to the cart.",
    breadcrumb: "Natural wine box",
    boxesHeading: "Our natural wine boxes",
    faqHeading: "Common questions",
    intro:
      "A natural wine box at PACT is six bottles from the same producer in Languedoc. You get to know one farm in depth, with several wines from the same hands and the same soils. We put the boxes together. The price is shown in kronor including VAT. If you would rather pick single bottles, the full range is in the shop. New to natural wine? Read what natural wine is first.",
    draft:
      "Draft. This page is not published. Sofia (GC) needs to read the copy before it goes live.",
    producer: "Producer",
    wine: "Wine",
    type: "Type",
    price: "Price",
    total: "Total",
    inclVat: "incl. VAT",
    add: "Add the box to the cart",
    adding: "Adding to cart",
    added: "Added. The cart lists the bottles individually.",
    unavailable: "Box unavailable right now",
    missing: "Not found",
    unpublished: "Not published",
    notForSale: "Not for sale",
    ambiguous: "Several wines match this name",
    wrongProducer: "From another producer",
    producerMissing: "Producer was not found",
    loadError: "The wine list could not be loaded.",
  },
} as const;

export interface ProducerBoxTextLink {
  phrase: string;
  href: string;
}

export interface ProducerBoxFaqItem {
  question: string;
  answer: string;
  link?: ProducerBoxTextLink;
}

export const PRODUCER_BOXES_INTRO_LINKS: Record<
  AppLocale,
  readonly ProducerBoxTextLink[]
> = {
  sv: [
    { phrase: "butiken", href: "/vin" },
    { phrase: "vad naturvin är", href: "/guider/vad-ar-naturvin" },
  ],
  en: [
    { phrase: "shop", href: "/wine" },
    { phrase: "what natural wine is", href: "/guides/what-is-natural-wine" },
  ],
};

export const PRODUCER_BOXES_FAQ: Record<
  AppLocale,
  readonly ProducerBoxFaqItem[]
> = {
  sv: [
    {
      question: "Vad är en naturvinslåda?",
      answer: "En vinlåda med sex flaskor naturvin från samma producent, sammansatt av PACT.",
    },
    {
      question: "Kan jag blanda flaskor från olika producenter i en låda?",
      answer:
        "Nej, varje låda innehåller sex flaskor från en producent. Enskilda flaskor kan du lägga i varukorgen från butiken.",
      link: { phrase: "butiken", href: "/vin" },
    },
    {
      question: "Vad ingår i lådan?",
      answer:
        "De sex flaskorna listas under varje låda, med namn och årgång. Priset gäller hela lådan.",
    },
    {
      question: "Vad är naturvin?",
      answer:
        "Naturvin är vin gjort med låg intervention. Läs vad naturvin är.",
      link: { phrase: "vad naturvin är", href: "/guider/vad-ar-naturvin" },
    },
    {
      question: "Var hittar jag leverans- och köpvillkor?",
      answer: "Leverans och köp beskrivs i köpvillkoren.",
      link: { phrase: "köpvillkoren", href: "/villkor" },
    },
  ],
  en: [
    {
      question: "What is a natural wine box?",
      answer: "Six bottles from the same producer, put together by PACT.",
    },
    {
      question: "Can I mix bottles from different producers in one box?",
      answer:
        "No. Each box holds six bottles from one producer. You can add single bottles to the cart from the shop.",
      link: { phrase: "shop", href: "/wine" },
    },
    {
      question: "What is in the box?",
      answer:
        "The six bottles are listed under each box, with name and vintage. The price is for the whole box.",
    },
    {
      question: "What is natural wine?",
      answer:
        "Natural wine is wine made with low intervention. Read what natural wine is.",
      link: {
        phrase: "what natural wine is",
        href: "/guides/what-is-natural-wine",
      },
    },
    {
      question: "Where are the delivery and purchase terms?",
      answer: "Delivery and purchase are described on the terms page.",
      link: { phrase: "terms page", href: "/terms" },
    },
  ],
};

/**
 * Code default. An admin save in site_content (key producer_boxes) overrides
 * this without a deploy. published stays in this file.
 * Lines match wines by id. A quantity above 1 is the same wine twice.
 */
export const DEFAULT_PRODUCER_BOXES: readonly ProducerBoxDefinition[] = [
  {
    id: "mas-des-mesures",
    producerName: "Mas des Mesures",
    name: { sv: "Mas des Mesures", en: "Mas des Mesures" },
    story: {
      sv: "Vincent Augé gör vinerna på Mas des Mesures i Le Pradal. Gården ligger i Haute Vallée de l'Orb, Languedoc.",
      en: "Vincent Augé makes the wines at Mas des Mesures in Le Pradal. The farm is in the Haute Vallée de l'Orb, Languedoc.",
    },
    lines: [
      { wineId: "45b447d0-d552-4ed7-9672-44b956c30873", quantity: 1 },
      { wineId: "a4be54c1-cc31-4ac2-8ecb-43fff145bb4a", quantity: 1 },
      { wineId: "cb9f0070-24b0-4a6a-8cb0-0f6679033bbf", quantity: 1 },
      { wineId: "21fb0ac9-5865-4b5b-8ec3-74c69365ad17", quantity: 1 },
      { wineId: "2515ad2c-a947-4704-a132-6822d8b98abb", quantity: 1 },
      { wineId: "9301970e-5f34-473b-b891-5c5910ba8783", quantity: 1 },
    ],
  },
  {
    id: "la-marotte",
    producerName: "La Marotte",
    name: { sv: "La Marotte", en: "La Marotte" },
    story: {
      sv: "Julie Thelen och Xavier Auboux gör vinerna på La Marotte i Clairac. Gården ligger i Hérault, Languedoc.",
      en: "Julie Thelen and Xavier Auboux make the wines at La Marotte in Clairac. The farm is in Hérault, Languedoc.",
    },
    lines: [
      { wineId: "a38a5297-7e1e-4a9d-875c-b464860feaaf", quantity: 1 },
      { wineId: "22da5d35-a253-40e8-a870-82dd3230601a", quantity: 1 },
      { wineId: "68180a1e-2da7-40d7-81aa-02ecf2450e67", quantity: 1 },
      { wineId: "c606b878-2170-4a77-8daa-eae161361670", quantity: 1 },
      { wineId: "8f142080-120b-419b-b213-32477b43f1af", quantity: 1 },
      { wineId: "586aa643-e716-4ced-ae58-5b98e2826a79", quantity: 1 },
    ],
  },
  {
    id: "clos-fantine",
    producerName: "Clos Fantine",
    name: { sv: "Clos Fantine", en: "Clos Fantine" },
    story: {
      sv: "Carole, Corine och Olivier Andrieu gör vinerna på Clos Fantine i Cabrerolles. Gården ligger i Faugères, Languedoc.",
      en: "Carole, Corine and Olivier Andrieu make the wines at Clos Fantine in Cabrerolles. The farm is in Faugères, Languedoc.",
    },
    lines: [
      { wineId: "7715d93d-2750-4ff2-92a6-30c97806d937", quantity: 1 },
      { wineId: "b8bee44a-31ef-4843-b94b-ef38d9817192", quantity: 1 },
      { wineId: "fc6e9432-80f2-4ac3-a1fb-4e1e8bf37356", quantity: 1 },
      { wineId: "ae66260f-8a18-46cd-9e33-c826cf5e856c", quantity: 1 },
      { wineId: "04f91948-9dd0-43ff-90dc-652d724b4ee5", quantity: 1 },
      { wineId: "61a8806b-2771-4c0b-9572-4a1afee268ab", quantity: 1 },
    ],
  },
  {
    id: "chateau-del-ranq",
    producerName: "Château del Ranq",
    name: { sv: "Château del Ranq", en: "Château del Ranq" },
    story: {
      sv: "Laure och Sébastien gör vinerna på Château del Ranq i Claret. Gården ligger i Pic Saint-Loup, Hérault, Languedoc.",
      en: "Laure and Sébastien make the wines at Château del Ranq in Claret. The farm is in Pic Saint-Loup, Hérault, Languedoc.",
    },
    lines: [
      { wineId: "52e37614-fc84-480b-8263-73e12c8324f9", quantity: 1 },
      { wineId: "c9b4319a-8272-4b00-ba5e-ae904434ec65", quantity: 1 },
      { wineId: "e6ae56b6-a286-4341-b7b8-30cdd0a8cc61", quantity: 1 },
      { wineId: "3b38ee26-6085-45de-8495-b15459015ce0", quantity: 1 },
      { wineId: "1303dae7-927b-4664-b82d-057c2c38a33b", quantity: 2 },
    ],
  },
  {
    id: "hors-saison",
    producerName: "Hors Saison",
    name: { sv: "Hors Saison", en: "Hors Saison" },
    story: {
      sv: "Olga Ivanova gör vinerna på Hors Saison i Lunas. Gården ligger i Bédarieux, Hérault, Languedoc.",
      en: "Olga Ivanova makes the wines at Hors Saison in Lunas. The farm is in Bédarieux, Hérault, Languedoc.",
    },
    lines: [
      { wineId: "6f962b59-e082-4986-9d00-58466d72e7a5", quantity: 1 },
      { wineId: "43a22c65-40d7-4d82-912d-21a3133b5bf4", quantity: 1 },
      { wineId: "6bb433b2-d27b-466f-8b13-87e57e2304f9", quantity: 2 },
      { wineId: "b3042cce-9d7a-4f5c-9c09-dbf3d429c7b5", quantity: 1 },
      { wineId: "0c25db9f-2722-4fcc-aae6-61b873b109ac", quantity: 1 },
    ],
  },
  {
    id: "le-bouc-a-trois-pattes",
    producerName: "Le Bouc à Trois Pattes",
    name: { sv: "Le Bouc à Trois Pattes", en: "Le Bouc à Trois Pattes" },
    story: {
      sv: "Wim Wagemans gör vinerna på Le Bouc à Trois Pattes i Mons. Gården ligger i Mons-la-Trivalle, Haute Vallée de l'Orb, Languedoc.",
      en: "Wim Wagemans makes the wines at Le Bouc à Trois Pattes in Mons. The farm is in Mons-la-Trivalle, Haute Vallée de l'Orb, Languedoc.",
    },
    lines: [
      { wineId: "523f6b93-8eaf-48f2-ad62-0cdddbb757b4", quantity: 2 },
      { wineId: "509e0e4f-bb1c-475a-86a6-2632065f82cd", quantity: 1 },
      { wineId: "756c39af-4357-4a02-a96d-2f38301d9530", quantity: 1 },
      { wineId: "044fc03c-9abc-437c-bafb-f96728ae3ec1", quantity: 1 },
      { wineId: "e37dc294-8139-4269-aa4d-8b001b0e4235", quantity: 1 },
    ],
  },
];

export function producerBoxesPath(locale: AppLocale): string {
  return PRODUCER_BOXES_PATH[locale];
}

export function producerBoxesCanonical(locale: AppLocale): string {
  return `${PACT_CONFIG.baseUrl}${PRODUCER_BOXES_PATH[locale]}`;
}

export function isProducerBoxesPath(pathname: string): boolean {
  return (
    pathname === PRODUCER_BOXES_PATH.sv || pathname === PRODUCER_BOXES_PATH.en
  );
}

export function isProducerBoxesSlug(
  slug: string,
  locale: AppLocale,
): boolean {
  const path = PRODUCER_BOXES_PATH[locale];
  return slug === path.slice(path.lastIndexOf("/") + 1);
}

/** Pact sitemap only. Empty while PRODUCER_BOXES_PUBLISHED is false. */
export function producerBoxesSitemapPaths(): readonly string[] {
  if (!PRODUCER_BOXES_PUBLISHED) return [];
  return [PRODUCER_BOXES_PATH.sv, PRODUCER_BOXES_PATH.en];
}

/** Absolute 301 target on pactwines.com. Preserves the query string. */
export function pactProducerBoxesRedirectUrl(
  pathname: string,
  search: string = "",
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const qs = search && search !== "?" ? search : "";
  return `${PACT_CONFIG.baseUrl}${path}${qs}`;
}
