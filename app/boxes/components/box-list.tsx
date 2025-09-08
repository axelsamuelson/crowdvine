import type { Product } from "@/lib/shopify/types";
import { BoxListContent } from "./box-list-content";

interface BoxListProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function BoxList({ searchParams }: BoxListProps) {
  let boxes: Product[] = [];

  // Parse search params
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams?.sort === "string" ? resolvedSearchParams.sort : undefined;
  
  // Map sort parameters to our API
  let sortKey = "RELEVANCE";
  let reverse = false;
  
  if (sort) {
    switch (sort) {
      case "price-asc":
        sortKey = "PRICE";
        reverse = false;
        break;
      case "price-desc":
        sortKey = "PRICE";
        reverse = true;
        break;
      case "created-desc":
        sortKey = "CREATED_AT";
        reverse = true;
        break;
      case "created-asc":
        sortKey = "CREATED_AT";
        reverse = false;
        break;
      default:
        sortKey = "RELEVANCE";
        reverse = false;
    }
  }

  try {
    // Use our custom API instead of Shopify
    const url = new URL(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/collections/wine-boxes-collection/products`);
    url.searchParams.set('sortKey', sortKey);
    if (reverse) {
      url.searchParams.set('reverse', 'true');
    }
    
    const response = await fetch(url.toString(), {
      cache: 'no-store' // Ensure fresh data
    });
    
    if (response.ok) {
      boxes = await response.json();
    } else {
      console.error("Error fetching wine boxes:", response.status, response.statusText);
      boxes = [];
    }
  } catch (error) {
    console.error("Error fetching wine boxes:", error);
    boxes = [];
  }

  return <BoxListContent boxes={boxes} />;
}
