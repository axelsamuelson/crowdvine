import { storeCatalog } from "@/lib/shopify/constants";
import ProductList from "@/app/vin/components/product-list";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProductCardSkeleton } from "@/app/vin/components/product-card-skeleton";
import { getSiteConfig } from "@/lib/site-config";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCategoryUrlForGrape } from "@/lib/wine-categories";

type TopWineRow = {
  wine_name: string;
  handle: string;
  base_price_cents: number;
};

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/vin`;
  const title = "Naturvin online — köp direkt från Languedoc | PACT Wines";
  const description =
    "Bläddra bland 60+ naturviner direktimporterade från Languedoc. Ekologiskt, biodynamiskt och utan tillsatser. Hemleverans i Stockholm.";

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        sv: `${config.baseUrl}/vin`,
        en: `${config.baseUrl}/wine`,
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
    },
  };
}

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export default async function VinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const fgrape = sp.fgrape;
  if (fgrape) {
    const grape = Array.isArray(fgrape) ? fgrape[0] : fgrape;
    if (grape) {
      const categoryUrl = getCategoryUrlForGrape(grape, "sv");
      if (
        categoryUrl &&
        (!Array.isArray(fgrape) || fgrape.length === 1)
      ) {
        redirect(categoryUrl);
      }
    }
  }

  const config = await getSiteConfig();

  const sb = getSupabaseAdmin();
  const { data: topWinesRaw } = await sb
    .from("wines")
    .select("wine_name, handle, base_price_cents")
    .eq("is_live", true)
    .limit(10);

  const topWines = (topWinesRaw ?? []) as TopWineRow[];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Naturvin från Languedoc",
    url: `${config.baseUrl}/vin`,
    numberOfItems: topWines.length,
    itemListElement: topWines.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w.wine_name,
      url: `${config.baseUrl}/produkt/${w.handle}`,
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
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        }
      >
        <ProductList
          collection={storeCatalog.rootCategoryId}
          searchParams={sp}
        />
      </Suspense>
    </>
  );
}
