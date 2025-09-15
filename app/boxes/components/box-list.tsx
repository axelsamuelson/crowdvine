import { getCollectionProducts } from "@/lib/shopify";
import type { Product } from "@/lib/shopify/types";
import { BoxListContent } from "./box-list-content";

interface BoxListProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function BoxList({ searchParams }: BoxListProps) {
  let boxes: Product[] = [];

  try {
    boxes = await getCollectionProducts({
      collection: "wine-boxes",
    });
  } catch (error) {
    console.error("Error fetching wine boxes:", error);
    boxes = [];
  }

  return <BoxListContent boxes={boxes} />;
}
