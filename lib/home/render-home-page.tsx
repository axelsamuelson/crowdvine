import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { HomeHero } from "@/components/home/home-hero";
import {
  HomeTasteQuizCollapsible,
  HomeTasteQuizProvider,
} from "@/components/home/home-taste-quiz-panel";
import { getQuizWines } from "@/lib/taste-quiz/get-quiz-wines";
import type { Metadata } from "next";
import { getCollections, getProducts } from "@/lib/shopify";
import { getLabelPosition } from "@/lib/utils";
import type { Product } from "@/lib/shopify/types";
import { PACT_DEFAULT_COPY } from "@/lib/site-config";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { getHomepageHeroImages } from "@/lib/actions/content";
import { getHomepageHeroCopy } from "@/lib/get-homepage-hero-copy";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  homePathForLocale,
  PACT_PUBLIC_ORIGIN,
} from "@/lib/i18n/localized-routes";

export async function buildHomeMetadata(locale: AppLocale): Promise<Metadata> {
  const config = getPublicSiteConfig();
  const seoOrigin = PACT_PUBLIC_ORIGIN;
  const svHome = `${seoOrigin}/`;
  const enHome = `${seoOrigin}/en`;
  const canonical = `${seoOrigin}${homePathForLocale(locale)}`;

  const pactCopy = PACT_DEFAULT_COPY[locale];
  const title = pactCopy.title;
  const description = pactCopy.description;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        "sv-SE": svHome,
        en: enHome,
        "x-default": enHome,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: locale === "sv" ? "sv_SE" : "en_US",
      images: defaultOpenGraphImages({
        siteName: config.siteName,
        locale,
      }),
    },
    twitter: pageTwitterCard(title, description),
  };
}

export async function renderHomePage(locale: AppLocale) {
  const config = getPublicSiteConfig();
  const productCurrencyParams = {
    displayCurrencyCode: "SEK" as const,
    sekToDisplayRate: 1,
  };

  const [
    collections,
    quizWines,
    featuredProductsRaw,
    heroImages,
    heroCopy,
  ] = await Promise.all([
    getCollections().catch((error) => {
      console.warn("Failed to fetch collections in home page:", error);
      return [] as Awaited<ReturnType<typeof getCollections>>;
    }),
    getQuizWines(locale).catch((error) => {
      console.warn("Failed to fetch taste quiz wines:", error);
      return [] as Awaited<ReturnType<typeof getQuizWines>>;
    }),
    getProducts({
      limit: 5,
      sortKey: "CREATED_AT",
      reverse: true,
      host: null,
      locale,
      ...productCurrencyParams,
    }).catch((error) => {
      console.error("Error fetching featured products:", error);
      return [] as Product[];
    }),
    getHomepageHeroImages().catch(() => undefined),
    getHomepageHeroCopy(locale).catch(() => undefined),
  ]);

  let featuredProducts = featuredProductsRaw;
  if (featuredProducts.length === 0) {
    try {
      const allProducts = await getProducts({
        host: null,
        locale,
        ...productCurrencyParams,
      });
      featuredProducts = allProducts.slice(0, 8);
    } catch (fallbackError) {
      console.error("Error fetching fallback products:", fallbackError);
      featuredProducts = [];
    }
  }

  const [lastProduct, ...restProducts] = featuredProducts;
  const pageUrl = `${PACT_PUBLIC_ORIGIN}${homePathForLocale(locale)}`;

  const jsonLdDescription = PACT_DEFAULT_COPY[locale].description;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.name,
    url: pageUrl,
    logo: `${PACT_PUBLIC_ORIGIN}/favicon.png`,
    description: jsonLdDescription,
    areaServed: "Stockholm, Sweden",
    sameAs: ["https://www.instagram.com/pactwines"],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.name,
    url: pageUrl,
    description: jsonLdDescription,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />
      <main>
        <HomeTasteQuizProvider enabled={quizWines.length > 0}>
          <HomeHero images={heroImages} copy={heroCopy} />
          {quizWines.length > 0 && (
            <HomeTasteQuizCollapsible wines={quizWines} locale={locale} />
          )}
        </HomeTasteQuizProvider>
        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-sides">
          <HomeSidebar collections={collections} />
          <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
            {featuredProducts.length > 0 && (
              <>
                <LatestProductCard
                  className="col-span-2"
                  product={lastProduct}
                  principal
                  showLatestDrop
                  priority
                />

                {restProducts.map((product: Product, index: number) => (
                  <LatestProductCard
                    className="col-span-1"
                    key={product.id}
                    product={product}
                    labelPosition={getLabelPosition(index)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}