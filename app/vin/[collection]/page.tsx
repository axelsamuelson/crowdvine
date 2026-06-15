import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ProductList from "../components/product-list";
import { ProductListContent } from "../components/product-list-content";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { getSourceSlugsByWineIds } from "@/lib/external-prices/db";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { generateProducerSlug } from "@/lib/producer-handle";
import { producerPageUrls } from "@/lib/i18n/localized-routes";
import {
  producerShopPageHeading,
  producerShopPagePath,
} from "@/lib/i18n/producer-shop-page";
import { getCollection } from "@/lib/shopify";
import { getSiteConfig } from "@/lib/site-config";
import {
  WINE_CATEGORIES_SV,
} from "@/lib/wine-categories";
import { resolveGrapeCategoryBySlug } from "@/lib/wine-grape-categories";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return WINE_CATEGORIES_SV.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection: slug } = await props.params;

  const category = await resolveGrapeCategoryBySlug(slug, "sv");
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
  if (!collection) return {};

  const shopHeading = producerShopPageHeading(collection.title, "sv");
  const shopUrl = `${config.baseUrl}${producerShopPagePath(collection.title, "sv")}`;
  const producerSlug = generateProducerSlug(collection.title);
  const producerUrls = producerPageUrls(producerSlug);

  return {
    title: shopHeading,
    description:
      collection.seo?.description ||
      collection.description ||
      `${shopHeading} — naturvin direkt från Languedoc.`,
    alternates: {
      canonical: shopUrl,
      languages: {
        sv: shopUrl,
        en: `${config.baseUrl}${producerShopPagePath(collection.title, "en")}`,
        "x-default": shopUrl,
      },
    },
    openGraph: {
      title: `${shopHeading} | PACT Wines`,
      description:
        collection.seo?.description ||
        collection.description ||
        `${shopHeading} — naturvin direkt från Languedoc.`,
      url: shopUrl,
      type: "website",
    },
  };
}

export default async function VinCollectionPage(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { collection: slug } = await props.params;
  const searchParams = await props.searchParams;

  const category = await resolveGrapeCategoryBySlug(slug, "sv");
  if (category) {
    const [config, rawProducts] = await Promise.all([
      getSiteConfig(),
      fetchProductsData({
        filterColor: category.filter.color,
        filterTags: category.filter.tags,
        filterIsNatural: category.filter.isNatural,
        filterFarming: category.filter.farming,
        filterGrape: category.filter.filterGrape,
        isB2BSite: false,
      }),
    ]);

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

  if (collection.handle !== slug) {
    redirect(`/vin/${collection.handle}`);
  }

  const config = await getSiteConfig();
  const producerSlug = generateProducerSlug(collection.title);
  const producerUrls = producerPageUrls(producerSlug);
  const shopHeading = producerShopPageHeading(collection.title, "sv");
  const shopUrl = `${config.baseUrl}${producerShopPagePath(collection.title, "sv")}`;

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
        name: collection.title,
        item: producerUrls.sv,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: shopHeading,
        item: shopUrl,
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
      <div className="p-sides pt-8">
        <h1 className="mb-3 text-3xl font-medium text-stone-900">{shopHeading}</h1>
      </div>
      <ProductList
        collection={slug}
        searchParams={searchParams}
        breadcrumbLabel={shopHeading}
      />
    </>
  );
}
