/** Bilingual sublist guide: champagne from TOP_100_WINES. */

export const WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS = {
  en: "/guides/worlds-best-natural-champagne",
  sv: "/guider/varldens-basta-naturliga-champagne",
} as const;

/** @deprecated Use WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS.en */
export const WORLDS_BEST_NATURAL_CHAMPAGNE_PATH =
  WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS.en;

export const worldsBestNaturalChampagneGuide = {
  path: WORLDS_BEST_NATURAL_CHAMPAGNE_PATHS,
  h1: {
    en: "The world's best natural champagne",
    sv: "Världens bästa naturliga champagne",
  },
  metaTitle: {
    en: "The world's best natural champagne — grower producers ranked",
    sv: "Världens bästa naturliga champagne — grower-producenter rankade",
  },
  metaDescription: {
    en: "Grower champagne made with natural wine principles — low dosage, no added yeast, minimal sulphur. Our curated list of the world's finest natural champagne.",
    sv: "Grower champagne gjord med naturvinsprinciper — låg dosage, ingen tillsatt jäst, minimalt svavel. Vår kurerade lista över världens finaste naturliga champagne.",
  },
  breadcrumbShort: {
    en: "Best Natural Champagne",
    sv: "Bästa naturliga champagne",
  },
  hubCard: {
    title: {
      en: "The world's best natural champagne — grower producers ranked",
      sv: "Världens bästa naturliga champagne — grower-producenter rankade",
    },
    description: {
      en: "Grower champagne from our top 100 — Selosse, Bouchard, Prévost and more.",
      sv: "Grower champagne från vår topp 100 — Selosse, Bouchard, Prévost och fler.",
    },
  },
  intro: {
    en: [
      "Champagne and natural wine seem like opposites. One is the most industrial, manipulated category in fine wine — blended across years, dosed with sugar, filled with added yeast. The other is built on transparency and minimal intervention. Yet the two have always coexisted, in the work of a small number of growers who refused to follow the houses' methods.",
      "Grower champagne — made by the person who grows the grapes, from their own land — is where natural wine principles found their way into Champagne. Anselme Selosse was the pivot: he brought Burgundian parcellaire thinking to a region built on blending, used barrel fermentation and oxidative élevage, and created a category that is now one of the most sought-after in wine.",
      "This is our selection of the finest natural champagne from our list of the world's 100 best natural wines.",
    ],
    sv: [
      "Champagne och naturvin verkar som motsatser. Det ena är den mest industriella, manipulerade kategorin i finvin — blandad över årgångar, doserad med socker, fylld med tillsatt jäst. Det andra bygger på transparens och minimal intervention. Ändå har de alltid samexisterat, i arbetet hos ett litet antal odlare som vägrat följa husens metoder.",
      "Grower champagne — gjord av den som odlar druvorna, från den egna marken — är där naturvinsprinciper hittade sin väg in i Champagne. Anselme Selosse var vändpunkten: han tog med sig bourgognetänkandets parcellaire-approach till en region byggd på blandning, använde fatjäsning och oxidativ elevage och skapade en kategori som idag är en av vinets mest eftersökta.",
      "Det här är vårt urval av den finaste naturliga champagnen från vår lista över världens 100 bästa naturviner.",
    ],
  },
  listHeading: {
    en: (count: number) => `${count} champagnes from our top 100 list`,
    sv: (count: number) => `${count} champagner från vår topp 100-lista`,
  },
  links: [
    {
      label: {
        en: "See our full list of the world's 100 best natural wines →",
        sv: "Se vår kompletta lista över världens 100 bästa naturviner →",
      },
      href: {
        en: "/guides/worlds-best-natural-wines",
        sv: "/guider/varldens-basta-naturviner",
      },
    },
    {
      label: {
        en: "Jacques Selosse — the producer who invented grower champagne →",
        sv: "Jacques Selosse →",
      },
      href: {
        en: "/guides/jacques-selosse",
        sv: "/guider/jacques-selosse",
      },
    },
    {
      label: {
        en: "The world's 100 best natural wine producers →",
        sv: "Världens 100 bästa naturvinsproducenter →",
      },
      href: {
        en: "/guides/worlds-best-natural-wine-producers",
        sv: "/guider/varldens-basta-naturvinsproducenter",
      },
    },
    {
      label: {
        en: "Explore our natural wine selection →",
        sv: "Utforska naturvin →",
      },
      href: {
        en: "/vin/naturvin",
        sv: "/vin/naturvin",
      },
    },
  ],
} as const;
