import { ProductListContent } from "@/app/vin/components/product-list-content";
import { ProductListLcpPreload } from "@/app/vin/components/product-list-lcp-preload";
import { ResultsCountBridge } from "@/app/vin/components/results-count-bridge";
import type { AppLocale } from "@/lib/i18n/locale";
import type { Collection, Product } from "@/lib/shopify/types";

type ProductListShellProps = {
  products: Product[];
  locale: AppLocale;
  collections?: Collection[];
  selectedProducers?: string[];
  collectionHandle?: string;
  wineSourceSlugs?: Record<string, string[]>;
  searchQuery?: string;
  breadcrumbLabel?: string;
};

/** Server shell: LCP preload + client product grid. */
export function ProductListShell({
  products,
  locale: _locale,
  collections = [],
  selectedProducers = [],
  collectionHandle,
  wineSourceSlugs = {},
  searchQuery = "",
  breadcrumbLabel,
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
      />
    </>
  );
}
