"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isProducerBoxesPath } from "@/lib/producer-boxes/config";
import { mergeWineCategoryContent } from "@/lib/wine-category-content";
import { getWineCategoryEn, getWineCategorySv } from "@/lib/wine-categories";
import { useProducts } from "@/components/shop/products-provider";
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
  const category = path.startsWith("/wine/")
    ? getWineCategoryEn(slug)
    : getWineCategorySv(slug);
  return category ? mergeWineCategoryContent(category) : null;
}

export function ShopLoadingFallback() {
  const pathname = usePathname();
  const { products } = useProducts();
  const category = getCategoryFromPathname(pathname);

  if (isProducerBoxesPath(pathname) || products.length === 0) {
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
          {category.descriptionLink ? (
            <p className="mt-3 leading-relaxed text-stone-600">
              <Link
                href={category.descriptionLink.href}
                className="underline underline-offset-4 hover:text-stone-900"
              >
                {category.descriptionLink.label}
              </Link>
            </p>
          ) : null}
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
