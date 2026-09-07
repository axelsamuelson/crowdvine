import { ProductListContent } from "@/app/vin/components/product-list-content";
import { ProductListLcpPreload } from "@/app/vin/components/product-list-lcp-preload";
import { ProductListStaticGrid } from "@/app/vin/components/product-list-static-grid";
import { ResultsCountBridge } from "@/app/vin/components/results-count-bridge";
import type { AppLocale } from "@/lib/i18n/locale";
import type { Collection, Product } from "@/lib/shopify/types";

const STATIC_ABOVE_FOLD = 8;

type ProductListShellProps = {
  products: Product[];
  locale: AppLocale;
  collections?: Collection[];
  selectedProducers?: string[];
  collectionHandle?: string;
  wineSourceSlugs?: Record<string, string[]>;
  searchQuery?: string;
  breadcrumbLabel?: string;
  producerProfileHref?: string;
  producerProfileLabel?: string;
};

/** Server shell: LCP preload + SSR above-fold grid + client product list. */
export function ProductListShell({
  products,
  locale,
  collections = [],
  selectedProducers = [],
  collectionHandle,
  wineSourceSlugs = {},
  searchQuery = "",
  breadcrumbLabel,
  producerProfileHref,
  producerProfileLabel,
}: ProductListShellProps) {
  return (
    <>
      <ProductListLcpPreload products={products} />
      <ResultsCountBridge count={products.length} />
      <ProductListContent
        products={products}
        collections={collections}
        selectedProducers={selectedProducers}
        collectionHandle={collectionHandle}
        wineSourceSlugs={wineSourceSlugs}
        searchQuery={searchQuery}
        breadcrumbLabel={breadcrumbLabel}
        producerProfileHref={producerProfileHref}
        producerProfileLabel={producerProfileLabel}
      >
        <ProductListStaticGrid
          products={products.slice(0, STATIC_ABOVE_FOLD)}
          locale={locale}
        />
      </ProductListContent>
    </>
  );
}
