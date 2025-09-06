import { ProductGrid } from "@/app/shop/components/product-grid";
import { ProductCardSkeleton } from "@/app/shop/components/product-card-skeleton";
import { Suspense } from "react";
import type { Product } from "@/lib/shopify/types";

interface BoxListContentProps {
  boxes: Product[];
}

export function BoxListContent({ boxes }: BoxListContentProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="base-grid py-sides">
        <div className="col-span-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              Wine Boxes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Discover our carefully curated wine packages featuring organic wines, 
              light reds, pet-nat, and premium collections. Perfect for gifting or 
              exploring new flavors.
            </p>
          </div>

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
            {boxes.length > 0 ? (
              <ProductGrid products={boxes} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No wine boxes available at the moment.
                </p>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
