import { storeCatalog } from "@/lib/shopify/constants";
import ProductList from "./components/product-list";
import { Metadata } from "next";
import { Suspense } from "react";
import { ProductCardSkeleton } from "./components/product-card-skeleton";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { translate } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getShoppingContextFromRequest().catch(() =>
    fallbackShoppingContext(),
  );
  return {
    title: translate(ctx.locale, "shop.pageTitle"),
    description: translate(ctx.locale, "shop.pageDescription"),
    alternates: {
      canonical: "https://pactwines.com/shop",
    },
    openGraph: {
      title: "Shop — Naturvin från Languedoc | PACT",
      url: "https://pactwines.com/shop",
      type: "website",
    },
  };
}

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  return (
    <>
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
