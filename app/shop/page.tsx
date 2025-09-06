import { storeCatalog } from "@/lib/shopify/constants";
import ProductList from "./components/product-list";
import { Metadata } from "next";
import { Suspense } from "react";
import ResultsControls from "./components/results-controls";
import { ProductGrid } from "./components/product-grid";
import { ProductCardSkeleton } from "./components/product-card-skeleton";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop for wines",
};

// Enable ISR with 1 minute revalidation
export const revalidate = 60;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
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
          searchParams={searchParams}
        />
      </Suspense>
    </>
  );
}
