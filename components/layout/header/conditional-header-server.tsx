import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import { resolveSiteLogosFromHeaders } from "@/lib/site-logos-server";
import { ConditionalHeader } from "./conditional-header";
import type { Collection } from "@/lib/shopify/types";

export async function ConditionalHeaderServer({
  collections,
  ssrPathname,
}: {
  collections: Collection[];
  ssrPathname: string;
}) {
  const isDirtywineSite = await getIsDirtywineSiteFromHeaders();
  const initialLogos = await resolveSiteLogosFromHeaders();

  return (
    <ConditionalHeader
      collections={collections}
      isDirtywineSite={isDirtywineSite}
      initialLogos={initialLogos}
      ssrPathname={ssrPathname}
    />
  );
}
