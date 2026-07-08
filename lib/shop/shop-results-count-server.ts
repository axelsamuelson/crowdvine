import { headers } from "next/headers";

import { fetchProductsData } from "@/lib/crowdvine/products-data";
import {
  getCachedAllWineSourceSlugs,
  pickWineSourceSlugsForProducts,
} from "@/lib/external-prices/cached-source-slugs";
import { isB2BHost } from "@/lib/b2b-site";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { applyShopUrlFilters } from "@/lib/shop/apply-shop-url-filters";
import { getCachedShopProducts } from "@/lib/shop/cached-shop-products";
import { getCachedShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import {
  getCollection,
  getCollectionProducts,
  getProducts,
} from "@/lib/shopify";
import {
  DEFAULT_B2B_SHOP_SORT,
  DEFAULT_B2C_SHOP_SORT,
  storeCatalog,
} from "@/lib/shopify/constants";
import type {
  Product,
  ProductCollectionSortKey,
  ProductSortKey,
} from "@/lib/shopify/types";
import { mapSortKeys } from "@/lib/shopify/utils";
import { resolveGrapeCategoryBySlug } from "@/lib/wine-grape-categories";

function shopSegmentFromPathname(pathname: string): string | undefined {
  if (pathname === "/vin" || pathname === "/wine") return undefined;
  const match = pathname.match(/^\/(?:vin|wine)\/([^/]+)$/);
  if (!match) return undefined;
  const segment = match[1];
  if (segment === "group") return undefined;
  return segment;
}

function localeFromPathname(pathname: string): "sv" | "en" {
  return pathname.startsWith("/wine") ? "en" : "sv";
}

async function fetchProductsForRoute(params: {
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

/** SSR product count for shop layout MobileFilters — mirrors ProductList + URL filters. */
export async function getShopLayoutResultsCount(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<number | undefined> {
  if (!/^\/(?:vin|wine)(?:\/|$)/.test(pathname)) {
    return undefined;
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const shoppingContext = await getCachedShoppingContextFromRequest().catch(() =>
      fallbackShoppingContext(),
    );
    const currencyParams = {
      displayCurrencyCode: shoppingContext.currencyCode,
      sekToDisplayRate: shoppingContext.sekToDisplayRate,
    };
    const isB2BSite = host != null ? isB2BHost(host) : true;
    const locale = localeFromPathname(pathname);
    const segment = shopSegmentFromPathname(pathname);

    const query =
      typeof searchParams.q === "string" ? searchParams.q : undefined;
    let sort =
      typeof searchParams.sort === "string" ? searchParams.sort : undefined;
    if (!sort) {
      sort = isB2BSite ? DEFAULT_B2B_SHOP_SORT : DEFAULT_B2C_SHOP_SORT;
    }

    const producers =
      typeof searchParams.producers === "string"
        ? searchParams.producers.split(",").filter(Boolean)
        : [];

    let products: Product[] = [];

    if (segment) {
      const category = await resolveGrapeCategoryBySlug(segment, locale);
      if (category) {
        const raw = await fetchProductsData({
          filterColor: category.filter.color,
          filterTags: category.filter.tags,
          filterIsNatural: category.filter.isNatural,
          filterFarming: category.filter.farming,
          filterGrape: category.filter.filterGrape,
          isB2BSite: false,
          ...currencyParams,
        });
        products = mapProductDataToShopProducts(raw);
      } else {
        const collection = await getCollection(segment);
        const handle = collection?.handle ?? segment;
        const isStockSort = sort === "in-stock" || sort === "out-of-stock";
        const isPopularSort = sort === "most-popular";
        const effectiveSort = isStockSort || isPopularSort ? undefined : sort;
        const { sortKey, reverse } = mapSortKeys(effectiveSort, "collection");

        products = await fetchProductsForRoute({
          collection: handle,
          producers: [],
          isRootCollection: false,
          query,
          sortKey,
          reverse,
          host,
          ...currencyParams,
          canUseProductCache: false,
        });
      }
    } else {
      const collection = storeCatalog.rootCategoryId;
      const isRootCollection =
        collection === "joyco-root" ||
        collection === "all-wines" ||
        collection === "frontpage" ||
        !collection;

      const isStockSort = sort === "in-stock" || sort === "out-of-stock";
      const isPopularSort = sort === "most-popular";
      const effectiveSort = isStockSort || isPopularSort ? undefined : sort;
      const { sortKey, reverse } = mapSortKeys(effectiveSort, "product");
      const canUseProductCache =
        isRootCollection && producers.length === 0 && !query && !isStockSort;

      products = await fetchProductsForRoute({
        collection,
        producers,
        isRootCollection,
        query,
        sortKey,
        reverse,
        host,
        ...currencyParams,
        canUseProductCache,
      });
    }

    const sourceFilters = searchParams.fsource;
    const hasSourceFilters = Array.isArray(sourceFilters)
      ? sourceFilters.length > 0
      : typeof sourceFilters === "string" && sourceFilters.length > 0;

    let wineSourceSlugs: Record<string, string[]> = {};
    if (hasSourceFilters) {
      const allSourceSlugs = await getCachedAllWineSourceSlugs();
      wineSourceSlugs = pickWineSourceSlugsForProducts(
        allSourceSlugs,
        products.map((p) => p.id).filter(Boolean),
      );
    }

    return applyShopUrlFilters(products, searchParams, wineSourceSlugs).length;
  } catch (error) {
    console.warn("Failed to compute shop layout results count:", error);
    return undefined;
  }
}
