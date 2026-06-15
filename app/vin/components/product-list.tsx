import {
  getCollectionProducts,
  getProducts,
} from "@/lib/shopify";
import type {
  Product,
  ProductCollectionSortKey,
  ProductSortKey,
} from "@/lib/shopify/types";
import { ProductListShell } from "./product-list-shell";
import { mapSortKeys } from "@/lib/shopify/utils";
import { headers } from "next/headers";
import { isB2BHost } from "@/lib/b2b-site";
import {
  DEFAULT_B2B_SHOP_SORT,
  DEFAULT_B2C_SHOP_SORT,
} from "@/lib/shopify/constants";
import {
  getCachedProductViewStatsByWineId,
  productViewStatsFromRecord,
  sortProductsByPopularity,
} from "@/lib/analytics/product-view-stats";
import {
  getCachedAllWineSourceSlugs,
  pickWineSourceSlugsForProducts,
} from "@/lib/external-prices/cached-source-slugs";
import { getCachedShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getCachedShopCollections } from "@/lib/shop/cached-layout-data";
import { getCachedShopProducts } from "@/lib/shop/cached-shop-products";

function sortProductsByStock(products: Product[], inStockFirst: boolean): Product[] {
  return [...products].sort((a, b) => {
    const stockA = (a as any).b2bStock ?? null;
    const stockB = (b as any).b2bStock ?? null;
    const aInStock = stockA != null && stockA > 0;
    const bInStock = stockB != null && stockB > 0;
    if (aInStock === bInStock) return 0;
    return inStockFirst ? (aInStock ? -1 : 1) : (bInStock ? -1 : 1);
  });
}

interface ProductListProps {
  collection: string;
  searchParams?: { [key: string]: string | string[] | undefined };
  breadcrumbLabel?: string;
}

async function fetchProductsForList(params: {
  collection: string;
  producers: string[];
  isRootCollection: boolean;
  query?: string;
  sortKey: ProductSortKey | ProductCollectionSortKey;
  reverse: boolean;
  host: string | null;
  displayCurrencyCode: string;
  sekToDisplayRate: number;
  canUseProductCache: boolean;
}): Promise<Product[]> {
  const {
    collection,
    producers,
    isRootCollection,
    query,
    sortKey,
    reverse,
    host,
    displayCurrencyCode,
    sekToDisplayRate,
    canUseProductCache,
  } = params;

  const currencyParams = { displayCurrencyCode, sekToDisplayRate };
  const isB2BSite = host != null ? isB2BHost(host) : true;

  if (producers.length > 0) {
    const allProducts: Product[] = [];
    for (const producerHandle of producers) {
      try {
        const producerProducts = await getCollectionProducts({
          collection: producerHandle,
          query,
          sortKey: sortKey as ProductCollectionSortKey,
          reverse,
          host,
          ...currencyParams,
        });
        allProducts.push(...producerProducts);
      } catch (error) {
        console.warn(
          `Error fetching products for producer ${producerHandle}:`,
          error,
        );
      }
    }
    return allProducts;
  }

  if (isRootCollection) {
    if (canUseProductCache) {
      const data = await getCachedShopProducts({
        sortKey: sortKey as ProductSortKey,
        reverse,
        isB2BSite,
        displayCurrencyCode,
        sekToDisplayRate,
      });
      return data as Product[];
    }

    return getProducts({
      sortKey: sortKey as ProductSortKey,
      query,
      reverse,
      host,
      ...currencyParams,
    });
  }

  return getCollectionProducts({
    collection,
    query,
    sortKey: sortKey as ProductCollectionSortKey,
    reverse,
    host,
    ...currencyParams,
  });
}

export default async function ProductList({
  collection,
  searchParams,
  breadcrumbLabel,
}: ProductListProps) {
  const resolvedSearchParams = searchParams ?? {};
  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q
      : undefined;
  let sort =
    typeof resolvedSearchParams.sort === "string"
      ? resolvedSearchParams.sort
      : undefined;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const shoppingContext = await getCachedShoppingContextFromRequest().catch(() =>
    fallbackShoppingContext(),
  );
  const productCurrencyParams = {
    displayCurrencyCode: shoppingContext.currencyCode,
    sekToDisplayRate: shoppingContext.sekToDisplayRate,
  };

  if (!sort) {
    sort = isB2BHost(host) ? DEFAULT_B2B_SHOP_SORT : DEFAULT_B2C_SHOP_SORT;
  }

  const producers =
    typeof resolvedSearchParams.producers === "string"
      ? resolvedSearchParams.producers.split(",").filter(Boolean)
      : [];

  const isRootCollection =
    collection === "joyco-root" ||
    collection === "all-wines" ||
    collection === "frontpage" ||
    !collection;

  const isStockSort = sort === "in-stock" || sort === "out-of-stock";
  const isPopularSort = sort === "most-popular";
  const effectiveSort = isStockSort || isPopularSort ? undefined : sort;
  const { sortKey, reverse } = isRootCollection
    ? mapSortKeys(effectiveSort, "product")
    : mapSortKeys(effectiveSort, "collection");

  const canUseProductCache =
    isRootCollection && producers.length === 0 && !query && !isStockSort;

  let products: Product[] = [];
  let collections: Awaited<ReturnType<typeof getCachedShopCollections>> = [];
  let wineSourceSlugs: Record<string, string[]> = {};

  try {
    const [fetchedProducts, fetchedCollections, viewStatsRecord, allSourceSlugs] =
      await Promise.all([
        fetchProductsForList({
          collection,
          producers,
          isRootCollection,
          query,
          sortKey,
          reverse,
          host,
          ...productCurrencyParams,
          canUseProductCache,
        }),
        getCachedShopCollections(),
        isPopularSort
          ? getCachedProductViewStatsByWineId()
          : Promise.resolve(null),
        getCachedAllWineSourceSlugs(),
      ]);

    products = fetchedProducts;
    collections = fetchedCollections;

    if (isStockSort) {
      products = sortProductsByStock(products, sort === "in-stock");
    }

    if (isPopularSort && viewStatsRecord) {
      products = sortProductsByPopularity(
        products,
        productViewStatsFromRecord(viewStatsRecord),
      );
    }

    const wineIds = products.map((p) => p.id).filter(Boolean);
    wineSourceSlugs = pickWineSourceSlugsForProducts(allSourceSlugs, wineIds);
  } catch (error) {
    console.error("Error fetching product list data:", error);
    products = [];
  }

  return (
    <ProductListShell
      products={products}
      locale={shoppingContext.locale}
      collections={collections}
      selectedProducers={producers}
      collectionHandle={collection}
      wineSourceSlugs={wineSourceSlugs}
      searchQuery={query ?? ""}
      breadcrumbLabel={breadcrumbLabel}
    />
  );
}
