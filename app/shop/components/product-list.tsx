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
  const sort =
    typeof (await searchParams)?.sort === "string"
      ? (await searchParams).sort
      : undefined;
  const producers =
    typeof (await searchParams)?.producers === "string"
      ? (await searchParams).producers.split(",").filter(Boolean)
      : [];
  const isRootCollection =
    collection === "joyco-root" ||
    collection === "all-wines" ||
    collection === "frontpage" ||
    !collection;

  const { sortKey, reverse } = isRootCollection
    ? mapSortKeys(sort, "product")
    : mapSortKeys(sort, "collection");

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

  const collections = await getCollections();

  return (
    <ProductListContent
      products={products}
      collections={collections}
      selectedProducers={producers}
    />
  );
}
