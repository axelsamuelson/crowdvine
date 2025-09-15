import { Metadata } from "next";
import { getCollection, getCollections } from "@/lib/shopify";
import { notFound } from "next/navigation";
import ProductList from "../components/product-list";

// Generate static params for all collections at build time
export async function generateStaticParams() {
  // Return static sample collections for build time
  // In production, these will be replaced by Cloudflare Pages Functions
  return [
    { collection: 'all-wines' },
    { collection: 'wine-boxes' },
    { collection: 'red-wines' },
  ];
}

// Enable ISR with 1 minute revalidation
export const revalidate = 60;

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const collection = await getCollection(params.collection);

  if (!collection) return notFound();

  return {
    title: `ACME Store | ${collection.seo?.title || collection.title}`,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
  };
}

export default function ShopCategory(props: {
  params: Promise<{ collection: string }>;
}) {
  // Static content for now - will be replaced with Pages Functions
  return (
    <ProductList collection="all-wines" searchParams={{}} />
  );
}
