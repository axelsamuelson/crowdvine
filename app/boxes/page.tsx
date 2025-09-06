import { Metadata } from "next";
import { Suspense } from "react";
import BoxList from "./components/box-list";
import { ProductCardSkeleton } from "@/app/shop/components/product-card-skeleton";

export const metadata: Metadata = {
  title: "Wine Boxes | Crowdvine",
  description: "Discover our curated wine boxes featuring organic wines, light reds, pet-nat, and premium collections.",
};

// Enable ISR with 1 minute revalidation
export const revalidate = 60;

export default async function BoxesPage({
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
            <ProductCardSkeleton />
          </div>
        }
      >
        <BoxList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
