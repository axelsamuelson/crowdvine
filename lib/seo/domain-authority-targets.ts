import type { GscSite } from "@/lib/gsc/performance";
import type { SitemapSiteProfile } from "@/lib/sitemap-entries";

export type DomainAuthorityTarget = {
  domain: string;
  gscSite: GscSite;
  siteProfile: SitemapSiteProfile;
  baseUrl: string;
};

/** Domains we track for the internal authority score. */
export const DOMAIN_AUTHORITY_TARGETS: readonly DomainAuthorityTarget[] = [
  {
    domain: "pactwines.com",
    gscSite: "pact",
    siteProfile: "pact",
    baseUrl: "https://pactwines.com",
  },
  {
    domain: "dirtywine.se",
    gscSite: "dirtywine",
    siteProfile: "dirtywine",
    baseUrl: "https://dirtywine.se",
  },
] as const;
