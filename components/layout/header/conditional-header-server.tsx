import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import { ConditionalHeader } from "./conditional-header";
import type { Collection } from "@/lib/shopify/types";

type SiteLogos = {
  headerLogo: string | null;
  footerLogo: string | null;
};

export async function ConditionalHeaderServer({
  collections,
  ssrPathname,
  initialLogos,
}: {
  collections: Collection[];
  ssrPathname: string;
  /** Prefer logos already resolved in root layout — avoids a duplicate DB round-trip. */
  initialLogos: SiteLogos;
}) {
  const isDirtywineSite = await getIsDirtywineSiteFromHeaders();

  return (
    <ConditionalHeader
      collections={collections}
      isDirtywineSite={isDirtywineSite}
      initialLogos={initialLogos}
      ssrPathname={ssrPathname}
    />
  );
}
