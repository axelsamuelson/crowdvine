import type { AppLocale } from "@/lib/i18n/locale";
import { PACT_CONFIG } from "@/lib/site-config";

/**
 * Unpublished until Sofia (GC) has read the copy and this flag is set to true.
 * Sitemap, index, and nav stay off while this is false.
 */
export const PRODUCER_BOXES_PUBLISHED = false;

export const PRODUCER_BOXES_CONTENT_KEY = "producer_boxes";

export const PRODUCER_BOXES_PATH = {
  sv: "/vin/naturvin-lada",
  en: "/wine/natural-wine-box",
} as const;

export type ProducerBoxId =
  | "mas-des-mesures"
  | "la-marotte"
  | "clos-fantine";

export interface ProducerBoxDefinition {
  id: ProducerBoxId;
  producerName: string;
  name: { sv: string; en: string };
  /** Two factual sentences. Placeholder until Sofia (GC) signs off. */
  story: { sv: string; en: string };
  /** Exact catalog names. Resolved to wine ids at request time. */
  wineNames: readonly string[];
}

export const PRODUCER_BOXES_COPY = {
  sv: {
    title: "Naturvinslåda: 6 flaskor från en producent",
    h1: "Naturvin i låda",
    meta: "Naturvin låda med 6 flaskor från en och samma producent. Varje låda samlar sex viner från en gård i Languedoc.",
    breadcrumb: "Naturvinlåda",
    intro:
      "Varje låda innehåller sex flaskor från en producent, till samma listpris som flaskorna var för sig.",
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
    producerMissing: "Producenten hittades inte",
    loadError: "Vinlistan kunde inte hämtas.",
  },
  en: {
    title: "Natural wine box: 6 bottles from one producer",
    h1: "Natural wine in a box",
    meta: "A natural wine box of 6 bottles from a single producer. Each box holds six wines from one Languedoc estate.",
    breadcrumb: "Natural wine box",
    intro:
      "Each box contains six bottles from one producer, at the same list price as the bottles on their own.",
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
    producerMissing: "Producer was not found",
    loadError: "The wine list could not be loaded.",
  },
} as const;

/**
 * Code default. An admin save in site_content (key producer_boxes) overrides
 * this without a deploy. published stays in this file.
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
    wineNames: [
      "Fractale",
      "Gemme",
      "Kairos",
      "Premices",
      "Claparedes",
      "Septentrion",
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
    wineNames: [
      "Debout",
      "Micocoulier",
      "Sorcières",
      "Bienvenu-e-s",
      "Résiste",
      "Vivace",
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
    wineNames: [
      "Faugères Tradition",
      "Impro",
      "La Lanterne Rouge",
      "Nuit d'Orage",
      "Une Case en Plus",
      "Fantaisie Orange",
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

/** Empty until PRODUCER_BOXES_PUBLISHED is flipped. Pact sitemap only. */
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
