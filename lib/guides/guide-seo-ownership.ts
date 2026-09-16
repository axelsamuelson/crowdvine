import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import {
  getSiteConfig,
  PACT_CONFIG,
  type SiteConfig,
} from "@/lib/site-config";

/**
 * Guides (/guider, /guides) are PACT-owned organic SEO.
 * Dirty Wine should win on brand search only — on dirtywine.se we
 * noindex guide URLs and point canonical / hreflang / JSON-LD at pactwines.com.
 */
export async function getGuideSeoOwnership(): Promise<{
  /** Display brand (titles may still say Dirty Wine on the B2B host). */
  config: SiteConfig;
  /** Origin for canonical, hreflang, Open Graph url, and JSON-LD. */
  seoBaseUrl: string;
  /** True on dirtywine.se — merge with any page-level noindex. */
  noindexForHost: boolean;
}> {
  const config = await getSiteConfig();
  const isDirtywine = await getIsDirtywineSiteFromHeaders();
  if (isDirtywine) {
    return {
      config,
      seoBaseUrl: PACT_CONFIG.baseUrl,
      noindexForHost: true,
    };
  }
  return {
    config,
    seoBaseUrl: config.baseUrl,
    noindexForHost: false,
  };
}
