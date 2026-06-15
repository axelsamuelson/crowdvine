import {
  getCollectionProducts,
  getCollections,
  getProducts,
} from "@/lib/shopify";
import type {
  Product,
  ProductCollectionSortKey,
  ProductSortKey,
} from "@/lib/shopify/types";
import { ProductListContent } from "./product-list-content";
import { mapSortKeys } from "@/lib/shopify/utils";
import { headers } from "next/headers";
import { isB2BHost } from "@/lib/b2b-site";
import {
  DEFAULT_B2B_SHOP_SORT,
  DEFAULT_B2C_SHOP_SORT,
} from "@/lib/shopify/constants";
import { getSourceSlugsByWineIds } from "@/lib/external-prices/db";
import {
  getProductViewStatsByWineId,
  sortProductsByPopularity,
} from "@/lib/analytics/product-view-stats";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";

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

export default async function ProductList({
  collection,
  searchParams,
  breadcrumbLabel,
}: ProductListProps) {
  const query =
    typeof (await searchParams)?.q === "string"
      ? (await searchParams).q
      : undefined;
  let sort =
    typeof (await searchParams)?.sort === "string"
      ? (await searchParams).sort
      : undefined;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const shoppingContext = await getShoppingContextFromRequest().catch(() =>
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
    typeof (await searchParams)?.producers === "string"
      ? (await searchParams).producers.split(",").filter(Boolean)
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

  let products: Product[] = [];

  try {
    if (producers.length > 0) {
      // Multi-producer filtering - get products from multiple collections
      const allProducts: Product[] = [];

      for (const producerHandle of producers) {
        try {
          const producerProducts = await getCollectionProducts({
            collection: producerHandle,
            query,
            sortKey: sortKey as ProductCollectionSortKey,
            reverse,
            host,
            ...productCurrencyParams,
          });
          allProducts.push(...producerProducts);
        } catch (error) {
          console.warn(
            `Error fetching products for producer ${producerHandle}:`,
            error,
          );
        }
      }

      products = allProducts;
    } else if (isRootCollection) {
      products = await getProducts({
        sortKey: sortKey as ProductSortKey,
        query,
        reverse,
        host,
        ...productCurrencyParams,
      });
    } else {
      products = await getCollectionProducts({
        collection,
        query,
        sortKey: sortKey as ProductCollectionSortKey,
        reverse,
        host,
        ...productCurrencyParams,
      });
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    products = [];
  }

  if (isStockSort) {
    products = sortProductsByStock(
      products,
      sort === "in-stock",
    );
  }

  if (isPopularSort) {
    try {
      const viewStats = await getProductViewStatsByWineId();
      products = sortProductsByPopularity(products, viewStats);
    } catch (error) {
      console.warn("Error sorting products by popularity:", error);
    }
  }

  let collections: Awaited<ReturnType<typeof getCollections>> = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Error fetching collections in ProductList:", error);
  }

  let wineSourceSlugs: Record<string, string[]> = {};
  try {
    const wineIds = products.map((p) => p.id).filter(Boolean);
    if (wineIds.length > 0) {
      wineSourceSlugs = await getSourceSlugsByWineIds(wineIds);
    }
  } catch (error) {
    console.warn("Error fetching wine source slugs in ProductList:", error);
  }

  return (
    <ProductListContent
      products={products}
      collections={collections}
      selectedProducers={producers}
      collectionHandle={collection}
      wineSourceSlugs={wineSourceSlugs}
      searchQuery={query ?? ""}
      breadcrumbLabel={breadcrumbLabel}
    />
  );
}
