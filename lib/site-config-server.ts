import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import {
  DIRTY_WINE_CONFIG,
  PACT_CONFIG,
  type SiteConfig,
} from "@/lib/site-config";

/**
 * Static PACT config for ISR public pages.
 * Does not read headers/cookies — safe for CDN-cached HTML shared by anonymous visitors.
 * Dirtywine branding hydrates client-side (B2B mode + logos).
 */
export function getPublicSiteConfig(): SiteConfig {
  return PACT_CONFIG;
}

/** Host-aware site config. Server-only: reads request headers (dynamic). */
export async function getSiteConfig(): Promise<SiteConfig> {
  const isDirtywine = await getIsDirtywineSiteFromHeaders();
  return isDirtywine ? DIRTY_WINE_CONFIG : PACT_CONFIG;
}
