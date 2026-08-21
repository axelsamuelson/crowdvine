/** English-only sublist guide: champagne from TOP_100_WINES. */

export const WORLDS_BEST_NATURAL_CHAMPAGNE_PATH =
  "/guides/worlds-best-natural-champagne" as const;

export const worldsBestNaturalChampagneGuide = {
  path: WORLDS_BEST_NATURAL_CHAMPAGNE_PATH,
  h1: "The world's best natural champagne",
  metaTitle:
    "The world's best natural champagne — grower producers ranked",
  metaDescription:
    "Grower champagne made with natural wine principles — low dosage, no added yeast, minimal sulphur. Our curated list of the world's finest natural champagne.",
  breadcrumbShort: "Best Natural Champagne",
  hubCard: {
    href: WORLDS_BEST_NATURAL_CHAMPAGNE_PATH,
    title: "The world's best natural champagne — grower producers ranked",
    description:
      "Grower champagne from our top 100 — Selosse, Bouchard, Prévost and more.",
  },
  intro: [
    "Champagne and natural wine seem like opposites. One is the most industrial, manipulated category in fine wine — blended across years, dosed with sugar, filled with added yeast. The other is built on transparency and minimal intervention. Yet the two have always coexisted, in the work of a small number of growers who refused to follow the houses' methods.",
    "Grower champagne — made by the person who grows the grapes, from their own land — is where natural wine principles found their way into Champagne. Anselme Selosse was the pivot: he brought Burgundian parcellaire thinking to a region built on blending, used barrel fermentation and oxidative élevage, and created a category that is now one of the most sought-after in wine.",
    "This is our selection of the finest natural champagne from our list of the world's 100 best natural wines.",
  ],
  listHeading: (count: number) =>
    `${count} champagnes from our top 100 list`,
  links: [
    {
      href: "/guides/worlds-best-natural-wines",
      label: "See our full list of the world's 100 best natural wines →",
    },
    {
      href: "/guides/worlds-best-natural-wine-producers",
      label: "The world's 100 best natural wine producers →",
    },
    {
      href: "/vin/naturvin",
      label: "Explore our natural wine selection →",
    },
  ],
} as const;
