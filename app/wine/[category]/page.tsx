import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import ProductList from "@/app/vin/components/product-list";
import { ProductListShell } from "@/app/vin/components/product-list-shell";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import {
  getCachedAllWineSourceSlugs,
  pickWineSourceSlugsForProducts,
} from "@/lib/external-prices/cached-source-slugs";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { generateProducerSlug } from "@/lib/producer-handle";
import {
  producerPageUrls,
  producerPublicPath,
} from "@/lib/i18n/localized-routes";
import {
  producerShopPageHeading,
  producerShopPagePath,
} from "@/lib/i18n/producer-shop-page";
import { asProducerCollectionData } from "@/lib/crowdvine/collections-data";
import { ProducerShopEditorialBlock } from "@/components/producer/producer-shop-editorial";
import {
  producerShopMetaDescription,
  producerShopPageTitle,
} from "@/lib/seo/producer-shop-metadata";
import { getCollection } from "@/lib/shopify";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getSiteConfig } from "@/lib/site-config";
import { categoryPageTitle } from "@/lib/seo/category-page-title";
import { shopCategoryCanonicalUrl } from "@/lib/wine-category-canonical";
import { categoryPageRobots } from "@/lib/seo/noindex-robots";
import { shopSearchParamsRobots } from "@/lib/seo/shop-search-robots";
import {
  getCategoryExploreLinks,
  getCategoryLongDescriptionHeading,
} from "@/lib/wine-category-explore-links";
import { buildFaqPageJsonLd } from "@/lib/wine-category-faq";
import { CategoryFaqSection } from "@/components/shop/category-faq-section";
import { WINE_CATEGORIES_EN } from "@/lib/wine-categories";
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

  const category = await resolveGrapeCategoryBySlug(slug, "en");
  if (category) {
    const config = await getSiteConfig();
    const pageUrl = `${config.baseUrl}/wine/${slug}`;
    const canonicalUrl = shopCategoryCanonicalUrl(slug, "en", config.baseUrl);

    const title = categoryPageTitle(category.title, config.siteName);

    return {
      title,
      description: category.metaDescription,
      robots: categoryPageRobots(slug, "en", searchParams),
      alternates: {
        canonical: canonicalUrl,
        languages: {
          en: pageUrl,
          sv: `${config.baseUrl}/vin/${category.hreflang ?? ""}`,
          "x-default": `${config.baseUrl}/vin/${category.hreflang ?? slug}`,
        },
      },
      openGraph: {
        title: category.title,
        description: category.metaDescription,
        url: canonicalUrl,
        type: "website",
      },
    };
  }

  const collection = await getCollection(slug);
  if (!collection) return {};

  const config = await getSiteConfig();
  const shopHeading = producerShopPageHeading(collection.title, "en");
  const shopUrl = `${config.baseUrl}${producerShopPagePath(collection.title, "en")}`;
  const producerCollection = asProducerCollectionData(collection);
  const shopTitle = producerShopPageTitle(collection.title, "en");
  const shopDescription = producerShopMetaDescription("en", {
    producerName: collection.title,
    handle: collection.handle,
  });

  return {
    title: shopTitle,
    description: shopDescription,
    robots: shopSearchParamsRobots(searchParams),
    alternates: {
      canonical: shopUrl,
      languages: {
        sv: `${config.baseUrl}${producerShopPagePath(collection.title, "sv")}`,
        en: shopUrl,
        "x-default": shopUrl,
      },
    },
    openGraph: {
      title: shopTitle,
      description: shopDescription,
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
    const config = await getSiteConfig();
    const producerSlug = generateProducerSlug(collection.title);
    const producerUrls = producerPageUrls(producerSlug);
    const shopUrl = `${config.baseUrl}${producerShopPagePath(collection.title, "en")}`;
    const producerCollection = asProducerCollectionData(collection);
    const profilePath = producerPublicPath(producerSlug, "en");

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
          name: collection.title,
          item: producerUrls.en,
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
          <h1 className="mb-3 text-3xl font-medium text-stone-900">
            {shopHeading}
          </h1>
        </div>
        <ProductList
          collection={slug}
          searchParams={searchParams}
          breadcrumbLabel={shopHeading}
          producerProfileHref={profilePath}
          producerProfileLabel={collection.title}
        />
        <ProducerShopEditorialBlock
          collection={producerCollection}
          locale="en"
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
  const allSourceSlugs = await getCachedAllWineSourceSlugs();
  const wineSourceSlugs = pickWineSourceSlugsForProducts(allSourceSlugs, wineIds);

  const canonical = shopCategoryCanonicalUrl(slug, "en", config.baseUrl);

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

  const exploreLinks = getCategoryExploreLinks(category);
  const faqJsonLd =
    category.faq && category.faq.length > 0
      ? buildFaqPageJsonLd(category.faq)
      : null;

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
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />
      ) : null}
      <div className="p-sides py-8">
        <div className="mb-8 max-w-2xl">
          <h1 className="mb-3 text-3xl font-medium text-stone-900">
            {category.h1}
          </h1>
          <p className="leading-relaxed text-stone-600">{category.description}</p>
        </div>

        <ProductListShell
          products={mappedProducts}
          locale="en"
          collections={[]}
          wineSourceSlugs={wineSourceSlugs}
          breadcrumbLabel={category.h1}
        />

        {category.longDescription ? (
          <div className="mt-16 pt-12">
            <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-stone-400">
              {getCategoryLongDescriptionHeading(category)}
            </h2>
            <div className="prose prose-stone prose-sm max-w-2xl">
              {category.longDescription.split("\n\n").map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </div>
        ) : null}

        {category.tastingProfile?.length ? (
          <div className="mt-12">
            <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-stone-400">
              Tasting profile
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {category.tastingProfile.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm leading-snug text-stone-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {category.foodPairing ? (
          <div className="mt-12">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">
              Food pairing
            </h2>
            <p className="max-w-xl text-sm text-stone-600">
              {category.foodPairing}
            </p>
          </div>
        ) : null}

        {(category.aboutText || exploreLinks.length > 0) && (
          <div className="mt-12 pt-12">
            {category.aboutText ? (
              <p className="mb-8 max-w-xl text-sm text-stone-600">
                {category.aboutText}
              </p>
            ) : null}
            <div>
              <h3 className="mb-3 text-sm font-medium text-stone-900">
                Explore more
              </h3>
              <div className="flex flex-wrap gap-2">
                {exploreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/guides/languedoc-natural-wine"
                  className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
                >
                  About natural wine from Languedoc
                </Link>
              </div>
            </div>
          </div>
        )}

        {category.faq?.length ? (
          <CategoryFaqSection h1={category.h1} locale="en" faq={category.faq} />
        ) : null}
      </div>
    </>
  );
}
