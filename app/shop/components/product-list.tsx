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

export default function ProductList({
  collection,
  searchParams,
}: ProductListProps) {
  // Static content for now - will be replaced with Pages Functions
  const products: Product[] = [];
  const collections: any[] = [];

  return <ProductListContent products={products} collections={collections} />;
}
