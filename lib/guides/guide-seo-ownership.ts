import { PACT_CONFIG, type SiteConfig } from "@/lib/site-config";

/**
 * Guides (/guider, /guides) are PACT-owned organic SEO.
 * On dirtywine.se, middleware 301s these paths to pactwines.com —
 * metadata here always targets the PACT origin.
 */
export async function getGuideSeoOwnership(): Promise<{
  config: SiteConfig;
  /** Origin for canonical, hreflang, Open Graph url, and JSON-LD. */
  seoBaseUrl: string;
}> {
  return {
    config: PACT_CONFIG,
    seoBaseUrl: PACT_CONFIG.baseUrl,
  };
}
