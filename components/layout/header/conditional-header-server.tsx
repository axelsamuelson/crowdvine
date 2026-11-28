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
  const withBudget = <T,>(
    label: string,
    promise: Promise<T>,
    fallback: T,
    ms = 8_000,
  ): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => {
        setTimeout(() => {
          console.warn(`[header] ${label} budget exceeded (${ms}ms)`);
          resolve(fallback);
        }, ms);
      }),
    ]);

  const emptyNav = { sv: [], en: [] };

  const [popularCollections, shopSubmenu, shopMega] = await Promise.all([
    pickPopularProducerCollections(collections),
    withBudget(
      "shop submenu",
      getShopNavSubmenu().catch((error) => {
        console.error("[header] shop submenu", error);
        return emptyNav;
      }),
      emptyNav,
    ),
    withBudget(
      "shop mega menu",
      getShopMegaMenu().catch((error) => {
        console.error("[header] shop mega menu", error);
        return emptyNav;
      }),
      emptyNav,
    ),
  ]);

  return (
    <ConditionalHeader
      popularCollections={toHeaderProducerLinks(popularCollections)}
      shopSubmenu={shopSubmenu}
      shopMega={shopMega}
    />
  );
}