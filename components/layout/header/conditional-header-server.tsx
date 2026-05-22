import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";
import { ConditionalHeader } from "./conditional-header";
import type { Collection } from "@/lib/shopify/types";

export async function ConditionalHeaderServer({
  collections,
}: {
  collections: Collection[];
}) {
  const isDirtywineSite = await getIsDirtywineSiteFromHeaders();
  return (
    <ConditionalHeader
      collections={collections}
      isDirtywineSite={isDirtywineSite}
    />
  );
}
