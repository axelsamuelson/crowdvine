import ProductList from "@/app/vin/components/product-list";
import { ProductCardSkeleton } from "@/app/vin/components/product-card-skeleton";
import { storeCatalog } from "@/lib/shopify/constants";
import { getSiteConfig } from "@/lib/site-config";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type TopWineRow = {
  wine_name: string;
  handle: string;
  base_price_cents: number;
};

const shopSkeleton = (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <ProductCardSkeleton />
    <ProductCardSkeleton />
    <ProductCardSkeleton />
  </div>
);

export async function MainShopContent({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  locale: "sv" | "en";
}) {
  const [sp, config] = await Promise.all([searchParams, getSiteConfig()]);
  const sb = getSupabaseAdmin();
  const { data: topWinesRaw } = await sb
    .from("wines")
    .select("wine_name, handle, base_price_cents")
    .eq("is_live", true)
    .limit(10);

  const topWines = (topWinesRaw ?? []) as TopWineRow[];
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
        }}
      />
      <ProductList collection={storeCatalog.rootCategoryId} searchParams={sp} />
    </>
  );
}

export { shopSkeleton };
