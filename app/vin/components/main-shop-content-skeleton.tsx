import { ProductCardSkeleton } from "@/app/vin/components/product-card-skeleton";

export const shopSkeleton = (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <ProductCardSkeleton />
    <ProductCardSkeleton />
    <ProductCardSkeleton />
  </div>
);
