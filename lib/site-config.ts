export type SiteConfig = {
  name: string;
  baseUrl: string;
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  twitterHandle?: string;
};

export const PACT_CONFIG: SiteConfig = {
  name: "PACT",
  baseUrl: "https://pactwines.com",
  siteName: "PACT Wines",
  defaultTitle: "PACT Wines — Naturvin från Frankrikes regioner",
  defaultDescription:
    "Naturvin från flera franska regioner, på delade pallar. Hemleverans med Budbee.",
};

export const DIRTY_WINE_CONFIG: SiteConfig = {
  name: "Dirty Wine",
  baseUrl: "https://dirtywine.se",
  siteName: "Dirty Wine",
  defaultTitle: "Dirty Wine — Naturvin till Stockholms restauranger",
  defaultDescription:
    "Naturvin från Frankrikes regioner för restauranger och sommelierer. B2B-import via Dirty Wine.",
};
