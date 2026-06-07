import { Metadata } from "next";
import { getCollection, getCollections } from "@/lib/shopify";
import { generateProducerSlug } from "@/lib/producer-handle";
import { notFound } from "next/navigation";
import ProductList from "../components/product-list";

// Generate static params for all collections at build time
export async function generateStaticParams() {
  // Temporarily disabled for Vercel deployment
  // TODO: Re-enable when Shopify API is accessible during build
  return [];
}

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const collection = await getCollection(params.collection);

  if (!collection) return notFound();

  const producerSlug = generateProducerSlug(collection.title);

  return {
    title: collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
    alternates: {
      canonical: `https://pactwines.com/producer/${producerSlug}`,
    },
    openGraph: {
      title: `${collection.title} — Naturvin från Languedoc | PACT`,
      url: `https://pactwines.com/producer/${producerSlug}`,
      type: "website",
    },
    robots: {
      index: collection.handle !== "wine-boxes",
      follow: true,
    },
  };
}

export default async function ShopCategory(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  return (
    <ProductList collection={params.collection} searchParams={searchParams} />
  );
}
