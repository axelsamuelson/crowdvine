import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductList from "../components/product-list";
import { ProductListContent } from "../components/product-list-content";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { getSourceSlugsByWineIds } from "@/lib/external-prices/db";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getCollection } from "@/lib/shopify";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getSiteConfig } from "@/lib/site-config";
import {
  getWineCategorySv,
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  return WINE_CATEGORIES_SV.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection: slug } = await props.params;

  const category = getWineCategorySv(slug);
  if (category) {
    const config = await getSiteConfig();
    const pageUrl = `${config.baseUrl}/vin/${slug}`;

    return {
      title: category.title,
      description: category.metaDescription,
      alternates: {
        canonical: pageUrl,
        languages: {
          sv: pageUrl,
          en: `${config.baseUrl}/wine/${category.hreflang ?? ""}`,
        },
      },
      openGraph: {
        title: category.title,
        description: category.metaDescription,
        url: pageUrl,
        type: "website",
      },
    };
  }

  const [config, collection] = await Promise.all([
    getSiteConfig(),
    getCollection(slug),
  ]);
  if (!collection) return notFound();

  const producerSlug = generateProducerSlug(collection.title);
  const producerUrl = `${config.baseUrl}/producer/${producerSlug}`;

  return {
    title: collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
    alternates: {
      canonical: producerUrl,
      languages: {
        sv: `https://pactwines.com/producer/${producerSlug}`,
        en: `https://pactwines.com/producer/${producerSlug}`,
        "x-default": `https://pactwines.com/producer/${producerSlug}`,
      },
    },
    openGraph: {
      title: `${collection.title} — Naturvin från Languedoc | PACT Wines`,
      url: producerUrl,
      type: "website",
    },
    robots: {
      index: collection.handle !== "wine-boxes",
      follow: true,
    },
  };
}

export default async function VinCollectionPage(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { collection: slug } = await props.params;
  const searchParams = await props.searchParams;

  const category = getWineCategorySv(slug);
  if (category) {
    const [config, shoppingContext] = await Promise.all([
      getSiteConfig(),
      getShoppingContextFromRequest({ skipUser: true }).catch(() =>
        fallbackShoppingContext(),
      ),
    ]);

    const rawProducts = await fetchProductsData({
      filterColor: category.filter.color,
      filterTags: category.filter.tags,
      filterIsNatural: category.filter.isNatural,
      filterGrape: category.filter.filterGrape,
      isB2BSite: false,
      displayCurrencyCode: shoppingContext.currencyCode,
      sekToDisplayRate: shoppingContext.sekToDisplayRate,
    });

    const mappedProducts = mapProductDataToShopProducts(rawProducts);

    const wineIds = rawProducts.map((p) => p.id).filter(Boolean);
    let wineSourceSlugs: Record<string, string[]> = {};
    if (wineIds.length > 0) {
      try {
        wineSourceSlugs = await getSourceSlugsByWineIds(wineIds);
      } catch (error) {
        console.warn(
          "Failed to fetch wine source slugs for category page:",
          error,
        );
      }
    }

    const canonical = `${config.baseUrl}/vin/${slug}`;

    const collectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: category.h1,
      description: category.metaDescription,
      url: canonical,
      numberOfItems: rawProducts.length,
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Alla viner",
          item: `${config.baseUrl}/vin`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: category.h1,
          item: `${config.baseUrl}/vin/${slug}`,
        },
      ],
    };

    const relatedCategories = WINE_CATEGORIES_SV.filter(
      (c) =>
        c.slug !== slug &&
        !c.slug.includes("languedoc") &&
        !c.slug.includes("frankrike") &&
        !c.slug.includes("stockholm") &&
        !c.slug.includes("direktimport"),
    ).slice(0, 4);

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />
        <div className="p-sides py-8">
          <div className="mb-8 max-w-2xl">
            <h1 className="mb-3 text-3xl font-medium text-stone-900">
              {category.h1}
            </h1>
            <p className="leading-relaxed text-stone-600">
              {category.description}
            </p>
          </div>

          {category.longDescription && (
            <div className="prose prose-stone mb-8 max-w-2xl text-sm">
              <p>{category.longDescription}</p>
            </div>
          )}

          <ProductListContent
            products={mappedProducts}
            collections={[]}
            wineSourceSlugs={wineSourceSlugs}
            breadcrumbLabel={category.h1}
          />

          <div className="mt-16 max-w-2xl border-t border-stone-200 pt-8">
            <h2 className="mb-3 text-lg font-medium text-stone-900">
              Om {category.h1.toLowerCase()}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-stone-600">
              {category.description} Alla viner är ekologiskt eller biodynamiskt
              odlade utan tillsatser.
            </p>
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium text-stone-900">
                Utforska mer
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={c.canonical}
                    className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                  >
                    {c.h1}
                  </Link>
                ))}
                <Link
                  href="/languedoc/naturvin"
                  className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                >
                  Om naturvin från Languedoc
                </Link>
                <Link
                  href="/how-it-works"
                  className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                >
                  Hur det fungerar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const collection = await getCollection(slug);
  if (!collection) return notFound();

  const producerSlug = generateProducerSlug(collection.title);
  const canonicalUrl = `https://pactwines.com/producer/${producerSlug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Alla viner",
        item: "https://pactwines.com/vin",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: collection.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <ProductList collection={slug} searchParams={searchParams} />
    </>
  );
}
