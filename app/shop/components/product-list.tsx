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

function isB2BHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase().split(":")[0];
  return (
    h.includes("dirtywine.se") ||
    (process.env.NEXT_PUBLIC_LOCAL_AS_DIRTYWINE === "1" &&
      (h === "localhost" || h === "127.0.0.1"))
  );
}

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
}

export default async function ProductList({
  collection,
  searchParams,
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
  if (isB2BHost(host) && !sort) sort = "in-stock";
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
  const effectiveSort = isStockSort ? undefined : sort;
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
      });
    } else {
      products = await getCollectionProducts({
        collection,
        query,
        sortKey: sortKey as ProductCollectionSortKey,
        reverse,
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

  let collections: Awaited<ReturnType<typeof getCollections>> = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Error fetching collections in ProductList:", error);
  }

  return (
    <ProductListContent
      products={products}
      collections={collections}
      selectedProducers={producers}
      collectionHandle={collection}
    />
  );
}
