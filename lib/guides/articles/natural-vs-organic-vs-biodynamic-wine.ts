/**
 * English-only guide: natural vs organic vs biodynamic wine labels.
 * Path: /guides/natural-vs-organic-vs-biodynamic-wine
 */

export const NATURAL_VS_ORGANIC_PATH =
  "/guides/natural-vs-organic-vs-biodynamic-wine" as const;

export const NATURAL_VS_ORGANIC_UPDATED = "2026-11-07";

/**
 * Root title.template appends ` | PACT Wines`, not ` | PACT`, so keep the
 * preferred suffix in an absolute metadata title.
 */
export const naturalVsOrganicMeta = {
  title: "Natural vs Organic Wine (and Biodynamic) Explained | PACT",
  description:
    "Natural vs organic wine vs biodynamic: how USDA organic, EU organic, Demeter and Vin Méthode Nature differ on farming, additives and sulfite limits.",
} as const;

export const naturalVsOrganicAuthor = {
  name: "Axel Samuelson",
  jobTitle: "Founder of PACT",
  byline: "By Axel Samuelson, founder of PACT",
} as const;

export type LabelComparisonColumn = {
  id: string;
  label: string;
  grapes: string;
  yeast: string;
  additives: string;
  addedSulfites: string;
  maxSo2: string;
  legalStatus: string;
};

export const LABEL_COMPARISON_ROWS = [
  { key: "grapes", label: "Grapes" },
  { key: "yeast", label: "Yeast" },
  { key: "additives", label: "Additives" },
  { key: "addedSulfites", label: "Added sulfites" },
  { key: "maxSo2", label: "Max total SO₂ (dry still)" },
  { key: "legalStatus", label: "Legal status" },
] as const;

export type LabelComparisonRowKey =
  (typeof LABEL_COMPARISON_ROWS)[number]["key"];

export const LABEL_COMPARISON_COLUMNS: LabelComparisonColumn[] = [
  {
    id: "eu-organic",
    label: "EU organic",
    grapes: "Certified organic",
    yeast: "Commercial yeast allowed",
    additives: "Restricted list",
    addedSulfites: "Yes",
    maxSo2: "100 mg/L (ppm) red, 150 mg/L (ppm) white/rosé",
    legalStatus: "EU law",
  },
  {
    id: "usda-organic",
    label: "USDA “organic”",
    grapes: "Certified organic",
    yeast: "Organic if available",
    additives: "National List only",
    addedSulfites: "No",
    maxSo2: "<10 mg/L (ppm), naturally occurring only",
    legalStatus: "US law",
  },
  {
    id: "usda-made-with",
    label: "USDA “made with organic grapes”",
    grapes: "100% certified organic",
    yeast: "Need not be organic",
    additives: "National List only",
    addedSulfites: "Yes",
    maxSo2: "<100 mg/L (ppm)",
    legalStatus: "US law",
  },
  {
    id: "demeter",
    label: "Biodynamic (Demeter France)",
    grapes: "Organic + biodynamic practices",
    yeast: "Native yeast to start fermentation",
    additives: "More restricted",
    addedSulfites: "Yes",
    maxSo2: "70 mg/L (ppm) red, 90 mg/L (ppm) white/rosé",
    legalStatus: "Private certification",
  },
  {
    id: "vmn",
    label: "Natural (Vin Méthode Nature)",
    grapes: "Certified organic, hand-harvested",
    yeast: "Native yeast only",
    additives: "None",
    addedSulfites: "Only after fermentation",
    maxSo2: "30 mg/L (ppm)",
    legalStatus: "Private charter",
  },
];

export const naturalVsOrganicFaqs = [
  {
    question: "Is organic wine the same as natural wine?",
    answer:
      "No. Organic covers farming and sets limits in the cellar. Natural wine goes further, with native yeasts and no additives, but has no legal definition.",
  },
  {
    question: "What is the difference between organic and biodynamic wine?",
    answer:
      "Biodynamic farming builds on organic farming with extra practices and, under Demeter, stricter cellar rules and lower sulfite limits.",
  },
  {
    question: "Does organic wine contain sulfites?",
    answer:
      "In the EU, yes, within limits. In the US, wine labeled “organic” has no added sulfites; “made with organic grapes” may contain up to 100 mg/L (ppm).",
  },
  {
    question: "Is natural wine sulfite-free?",
    answer:
      "Not always. Sulfites form naturally during fermentation. Some natural wines have no added sulfites; Vin Méthode Nature allows up to 30 mg/L (ppm).",
  },
  {
    question: "How can I tell if a wine is natural?",
    answer:
      "Look for a charter label such as Vin Méthode Nature, or ask the producer or retailer what was added.",
  },
] as const;

export const naturalVsOrganicHubCard = {
  title: "Natural vs Organic vs Biodynamic Wine",
  description:
    "What EU organic, USDA organic, Demeter and Vin Méthode Nature actually require — farming, additives and sulfites.",
} as const;

export const naturalVsOrganicInternalLinks = [
  {
    label: "What is natural wine? →",
    href: "/guides/what-is-natural-wine",
  },
  {
    label: "Natural wine from Languedoc →",
    href: "/guides/languedoc-natural-wine",
  },
  {
    label: "What is orange wine? →",
    href: "/guides/what-is-orange-wine",
  },
] as const;
