import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";

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
  defaultTitle: "PACT Wines — Naturvin direkt från Languedoc",
  defaultDescription:
    "Köp naturvin direkt från småproducenter i Languedoc. Hemleverans i Stockholm via PACT.",
};

export const DIRTY_WINE_CONFIG: SiteConfig = {
  name: "Dirty Wine",
  baseUrl: "https://dirtywine.se",
  siteName: "Dirty Wine",
  defaultTitle: "Dirty Wine — Naturvin från Languedoc, B2B import",
  defaultDescription:
    "Naturvin direkt från Languedoc för restauranger och sommelierer i Stockholm. B2B-import via Dirty Wine.",
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const isDirtywine = await getIsDirtywineSiteFromHeaders();
  return isDirtywine ? DIRTY_WINE_CONFIG : PACT_CONFIG;
}
