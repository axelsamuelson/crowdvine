"use client";

import { usePathname } from "next/navigation";

import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";
import { useProducts } from "../providers/products-provider";
import ResultsControls from "./results-controls";
import { ProductGrid } from "./product-grid";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";

function getCategorySlugFromPathname(path: string): string | null {
  if (path.startsWith("/vin/")) {
    return path.slice("/vin/".length).split("/")[0] || null;
  }
  if (path.startsWith("/wine/")) {
    return path.slice("/wine/".length).split("/")[0] || null;
  }
  return null;
}

function getCategoryFromPathname(path: string) {
  const slug = getCategorySlugFromPathname(path);
  if (!slug) return null;
  if (path.startsWith("/wine/")) {
    return getWineCategoryEn(slug);
  }
  return getWineCategorySv(slug);
}

export function ShopLoadingFallback() {
  const pathname = usePathname();
  const { products } = useProducts();
  const slug = getCategorySlugFromPathname(pathname);
  const category = getCategoryFromPathname(pathname);

  if (products.length > 0) {
    return (
      <div className="p-sides py-8">
        {category && (
          <div className="mb-8 max-w-2xl">
            <h1 className="mb-3 text-3xl font-medium text-stone-900">
              {category.h1}
            </h1>
            <p className="leading-relaxed text-stone-600">
              {category.description}
            </p>
          </div>
        )}
        <ResultsControls
          className="max-md:hidden"
          collections={[]}
          products={products}
          breadcrumbLabel={category?.h1}
        />
        <ProductGrid>
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </ProductGrid>
      </div>
    );
  }

  return (
    <div>
      <ResultsControls collections={[]} products={[]} />
      <ProductGrid>
        {Array.from({ length: 12 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </ProductGrid>
    </div>
  );
}
