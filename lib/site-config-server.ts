import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import {
  DIRTY_WINE_CONFIG,
  PACT_CONFIG,
  type SiteConfig,
} from "@/lib/site-config";

/** Host-aware site config. Server-only: reads request headers. */
export async function getSiteConfig(): Promise<SiteConfig> {
  const isDirtywine = await getIsDirtywineSiteFromHeaders();
  return isDirtywine ? DIRTY_WINE_CONFIG : PACT_CONFIG;
}
