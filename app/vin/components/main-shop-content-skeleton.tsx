import { ProductCardSkeleton } from "@/app/vin/components/product-card-skeleton";

export const shopSkeleton = (
  <div className="flex flex-col md:grid grid-cols-12 md:gap-4">
    <div
      aria-hidden
      className="col-span-3 max-md:hidden min-h-[480px] animate-pulse rounded-md bg-gradient-to-br from-neutral-200 to-neutral-200/30"
    />
    <div className="col-span-9 flex flex-col">
      <div
        aria-hidden
        className="md:hidden grid grid-cols-3 items-center px-sides py-2 mb-1"
      >
        <div className="h-8 w-16 animate-pulse rounded bg-neutral-200" />
        <div className="mx-auto h-4 w-20 animate-pulse rounded bg-neutral-200" />
        <div className="ml-auto h-8 w-16 animate-pulse rounded bg-neutral-200" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-0">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    </div>
  </div>
);
