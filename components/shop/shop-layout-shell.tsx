import { PageLayoutServer } from "@/components/layout/page-layout-server";
import {
  getCachedPriceSources,
  getCachedShopCollections,
} from "@/lib/shop/cached-layout-data";
import { ShopLayoutClient } from "@/components/shop/shop-layout-client";

export async function ShopLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  let collections = [];
  try {
    collections = await getCachedShopCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in shop layout:", error);
    collections = [];
  }

  let priceSources: { id: string; name: string; slug: string }[] = [];
  try {
    const sources = await getCachedPriceSources();
    priceSources = sources.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
  } catch (error) {
    console.warn("Failed to fetch price sources in shop layout:", error);
  }

  return (
    <PageLayoutServer>
      <ShopLayoutClient collections={collections} priceSources={priceSources}>
        {children}
      </ShopLayoutClient>
    </PageLayoutServer>
  );
}
