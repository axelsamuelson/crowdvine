import { pickPopularProducerCollections } from "@/lib/analytics/producer-ctr";
import { getShopMegaMenu } from "@/lib/nav/shop-mega-menu";
import { getShopNavSubmenu } from "@/lib/nav/shop-submenu";
import { toHeaderProducerLinks } from "@/lib/shop/shop-producer-link";
import { ConditionalHeader } from "./conditional-header";

/**
 * Server wrapper that only loads cacheable collection popularity.
 * The client receives the producers the menu renders (name + handle), not the
 * full producer records. Dirtywine / pathname hiding stays client-side so
 * this remains ISR-safe.
 */
export async function ConditionalHeaderServer({
  collections,
}: {
  collections: Array<{ id: string; handle: string; title: string }>;
}) {
  const [popularCollections, shopSubmenu, shopMega] = await Promise.all([
    pickPopularProducerCollections(collections),
    getShopNavSubmenu().catch((error) => {
      console.error("[header] shop submenu", error);
      return { sv: [], en: [] };
    }),
    getShopMegaMenu().catch((error) => {
      console.error("[header] shop mega menu", error);
      return { sv: [], en: [] };
    }),
  ]);

  return (
    <ConditionalHeader
      popularCollections={toHeaderProducerLinks(popularCollections)}
      shopSubmenu={shopSubmenu}
      shopMega={shopMega}
    />
  );
}