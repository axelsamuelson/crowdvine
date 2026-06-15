import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import ProductList from "@/app/vin/components/product-list";
import { ProductListContent } from "@/app/vin/components/product-list-content";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { getSourceSlugsByWineIds } from "@/lib/external-prices/db";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import {
  producerShopPageHeading,
  producerShopPagePath,
} from "@/lib/i18n/producer-shop-page";
import { getCollection } from "@/lib/shopify";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getSiteConfig } from "@/lib/site-config";
import { shopSearchParamsRobots } from "@/lib/seo/shop-search-robots";
import {
  WINE_CATEGORIES_EN,
} from "@/lib/wine-categories";
import { resolveGrapeCategoryBySlug } from "@/lib/wine-grape-categories";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return WINE_CATEGORIES_EN.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ category: slug }, searchParams] = await Promise.all([
    props.params,
    props.searchParams ?? Promise.resolve({}),
  ]);
  const robots = shopSearchParamsRobots(searchParams);

  const category = await resolveGrapeCategoryBySlug(slug, "en");
  if (category) {
    const config = await getSiteConfig();
    const pageUrl = `${config.baseUrl}/wine/${slug}`;

    return {
      title: category.title,
      description: category.metaDescription,
      robots,
      alternates: {
        canonical: pageUrl,
        languages: {
          en: pageUrl,
          sv: `${config.baseUrl}/vin/${category.hreflang ?? ""}`,
          "x-default": `${config.baseUrl}/vin/${category.hreflang ?? slug}`,
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

  const collection = await getCollection(slug);
  if (!collection) return {};

  const config = await getSiteConfig();
  const shopHeading = producerShopPageHeading(collection.title, "en");
  const shopUrl = `${config.baseUrl}${producerShopPagePath(collection.title, "en")}`;

  return {
    title: shopHeading,
    description:
      collection.seo?.description ||
      collection.description ||
      `${shopHeading} — natural wine direct from Languedoc.`,
    robots,
    alternates: {
      canonical: shopUrl,
      languages: {
        sv: `${config.baseUrl}${producerShopPagePath(collection.title, "sv")}`,
        en: shopUrl,
        "x-default": shopUrl,
      },
    },
    openGraph: {
      title: `${shopHeading} | PACT Wines`,
      description:
        collection.seo?.description ||
        collection.description ||
        `${shopHeading} — natural wine direct from Languedoc.`,
      url: shopUrl,
      type: "website",
    },
  };
}

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WineCategoryPage(props: PageProps) {
  const { category: slug } = await props.params;
  const searchParams = await props.searchParams;
  const category = await resolveGrapeCategoryBySlug(slug, "en");
  if (!category) {
    const collection = await getCollection(slug);
    if (!collection) {
      return <ProductList collection={slug} searchParams={searchParams} />;
    }

    if (collection.handle !== slug) {
      redirect(`/wine/${collection.handle}`);
    }

    const shopHeading = producerShopPageHeading(collection.title, "en");

    return (
      <>
        <div className="p-sides pt-8">
          <h1 className="mb-3 text-3xl font-medium text-stone-900">
            {shopHeading}
          </h1>
        </div>
        <ProductList
          collection={slug}
          searchParams={searchParams}
          breadcrumbLabel={shopHeading}
        />
      </>
    );
  }

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
    filterFarming: category.filter.farming,
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
      console.warn("Failed to fetch wine source slugs for category page:", error);
    }
  }

  const canonical = `${config.baseUrl}/wine/${slug}`;

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
        name: "All wines",
        item: `${config.baseUrl}/wine`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.h1,
        item: `${config.baseUrl}/wine/${slug}`,
      },
    ],
  };

  const relatedCategories = WINE_CATEGORIES_EN.filter(
    (c) =>
      c.slug !== slug &&
      !c.slug.includes("languedoc") &&
      !c.slug.includes("france") &&
      !c.slug.includes("stockholm") &&
      !c.slug.includes("direct-import"),
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
          <p className="leading-relaxed text-stone-600">{category.description}</p>
        </div>

        <ProductListContent
          products={mappedProducts}
          collections={[]}
          wineSourceSlugs={wineSourceSlugs}
          breadcrumbLabel={category.h1}
        />

        <div className="mt-16 max-w-2xl border-t border-stone-200 pt-8">
          <h2 className="mb-3 text-lg font-medium text-stone-900">
            About {category.h1.toLowerCase()}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-stone-600">
            {category.description} All wines are organically or biodynamically
            farmed without additives.
          </p>
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-medium text-stone-900">
              Explore more
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
                About natural wine from Languedoc
              </Link>
              <Link
                href="/how-it-works"
                className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
