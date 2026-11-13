export type SiteConfig = {
  name: string;
  baseUrl: string;
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  twitterHandle?: string;
};

/** Root layout default is Swedish. English is the home page absolute title. */
export const PACT_DEFAULT_COPY = {
  sv: {
    title: "PACT Wines – Köp naturvin online med hemleverans i Sverige",
    description:
      "Naturvin från små producenter, köpt tillsammans på delade pallar och levererat hem i Sverige.",
  },
  en: {
    title: "PACT Wines – Buy natural wine online, delivered in Sweden",
    description:
      "Natural wine from small producers, bought together on shared pallets and delivered to your home in Sweden.",
  },
} as const;

export const PACT_CONFIG: SiteConfig = {
  name: "PACT",
  baseUrl: "https://pactwines.com",
  siteName: "PACT Wines",
  defaultTitle: PACT_DEFAULT_COPY.sv.title,
  defaultDescription: PACT_DEFAULT_COPY.sv.description,
};

export const DIRTY_WINE_CONFIG: SiteConfig = {
  name: "Dirty Wine",
  baseUrl: "https://dirtywine.se",
  siteName: "Dirty Wine",
  defaultTitle: "Dirty Wine — Naturvin till Stockholms restauranger",
  defaultDescription:
    "Naturvin för restauranger i Stockholm. B2B-import via Dirty Wine.",
};
