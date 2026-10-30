import { ProductListContent } from "@/app/vin/components/product-list-content";
import { ProductListLcpPreload } from "@/app/vin/components/product-list-lcp-preload";
import { ProductListStaticGrid } from "@/app/vin/components/product-list-static-grid";
import { ResultsCountBridge } from "@/app/vin/components/results-count-bridge";
import type { AppLocale } from "@/lib/i18n/locale";
import { getCachedPalletZoneStatusForHandle } from "@/lib/pallet/get-zone-status";
import type { ZoneStatusPayload } from "@/lib/pallet/zone-status";
import { getPdpRequestHost } from "@/lib/crowdvine/pdp-product-cache";
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

async function loadAboveFoldPalletStatuses(
  products: Product[],
  host: string | null,
): Promise<Record<string, ZoneStatusPayload | null>> {
  const aboveFold = products.slice(0, STATIC_ABOVE_FOLD);
  const entries = await Promise.all(
    aboveFold.map(async (product) => {
      try {
        const status = await getCachedPalletZoneStatusForHandle(
          product.handle,
          host,
        );
        return [product.handle, status] as const;
      } catch {
        return [product.handle, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/** Server shell: LCP preload + SSR above-fold grid + client product list. */
export async function ProductListShell({
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
  const host = await getPdpRequestHost();
  const palletStatusByHandle = await loadAboveFoldPalletStatuses(products, host);

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
        palletStatusByHandle={palletStatusByHandle}
      >
        <ProductListStaticGrid
          products={products.slice(0, STATIC_ABOVE_FOLD)}
          locale={locale}
          palletStatusByHandle={palletStatusByHandle}
        />
      </ProductListContent>
    </>
  );
}
