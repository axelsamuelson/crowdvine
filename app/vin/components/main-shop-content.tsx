import { Suspense } from "react";
import { headers } from "next/headers";

import ProductList from "@/app/vin/components/product-list";
import { storeCatalog } from "@/lib/shopify/constants";
import { getSiteConfig } from "@/lib/site-config-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isB2BHost } from "@/lib/b2b-site";
import { fetchHiddenB2BWineIds } from "@/lib/b2b-pallet-stock";

type TopWineRow = {
  id: string;
  wine_name: string;
  handle: string;
  base_price_cents: number;
};

async function ShopItemListJsonLd({ locale }: { locale: "sv" | "en" }) {
  const config = await getSiteConfig();
  const sb = getSupabaseAdmin();
  const { data: topWinesRaw } = await sb
    .from("wines")
    .select("id, wine_name, handle, base_price_cents")
    .eq("is_live", true)
    .limit(10);

  const headerList = await headers();
  const isB2BSite = isB2BHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  const rows = (topWinesRaw ?? []) as TopWineRow[];
  const hiddenWineIds = isB2BSite
    ? await fetchHiddenB2BWineIds(
        sb,
        rows.map((wine) => wine.id),
      )
    : new Set<string>();
  const topWines = rows.filter((wine) => !hiddenWineIds.has(wine.id));
  const shopPath = locale === "sv" ? "/vin" : "/wine";
  const productPrefix = locale === "sv" ? "/produkt" : "/product";
  const listName =
    locale === "sv" ? "Naturvin från Languedoc" : "Natural Wine from Languedoc";

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: `${config.baseUrl}${shopPath}`,
    numberOfItems: topWines.length,
    itemListElement: topWines.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w.wine_name,
      url: `${config.baseUrl}${productPrefix}/${w.handle}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(itemListJsonLd),
      }}
    />
  );
}

export async function MainShopContent({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  locale: "sv" | "en";
}) {
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <ShopItemListJsonLd locale={locale} />
      </Suspense>
      <ProductList collection={storeCatalog.rootCategoryId} searchParams={sp} />
    </>
  );
}

export { shopSkeleton } from "./main-shop-content-skeleton";
