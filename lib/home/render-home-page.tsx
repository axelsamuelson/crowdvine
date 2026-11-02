import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { HomeHero } from "@/components/home/home-hero";
import {
  HomeTasteQuizCollapsible,
  HomeTasteQuizProvider,
} from "@/components/home/home-taste-quiz-panel";
import { getQuizWines } from "@/lib/taste-quiz/get-quiz-wines";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import type { Metadata } from "next";
import { getCollections, getProducts } from "@/lib/shopify";
import { getLabelPosition } from "@/lib/utils";
import type { Product } from "@/lib/shopify/types";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/site-config-server";
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
  const config = await getSiteConfig();
  const isDirtyWine = config.name === "Dirty Wine";
  const seoOrigin = PACT_PUBLIC_ORIGIN;
  const svHome = `${seoOrigin}/`;
  const enHome = `${seoOrigin}/en`;
  const canonical = `${seoOrigin}${homePathForLocale(locale)}`;

  const title =
    locale === "sv"
      ? isDirtyWine
        ? "Dirty Wine — Naturvin från Languedoc, B2B import Stockholm"
        : "PACT Wines — Naturvin från Frankrikes regioner"
      : isDirtyWine
        ? "Dirty Wine — Natural wine from Languedoc, B2B import Stockholm"
        : "PACT Wines — Natural wine from the regions of France";

  const description =
    locale === "sv"
      ? isDirtyWine
        ? "Naturvin från flera franska regioner för restauranger och sommelierer i Stockholm. Priser exkl. moms."
        : "Naturvin från flera franska regioner, samlastat på delade pallar. Leverans i Sverige där Budbee levererar."
      : isDirtyWine
        ? "Natural wine from several French regions for restaurants and sommeliers in Stockholm. Prices excl. VAT."
        : "Buy natural wine imported directly from small producers in Languedoc. Home delivery in Stockholm. No middlemen — lower price, more character.";

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        sv: svHome,
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
  const [h, config, shoppingContext] = await Promise.all([
    headers(),
    getSiteConfig(),
    getShoppingContextFromRequest({ skipUser: true }).catch(() =>
      fallbackShoppingContext(),
    ),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const productCurrencyParams = {
    displayCurrencyCode: shoppingContext.currencyCode,
    sekToDisplayRate: shoppingContext.sekToDisplayRate,
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
      host,
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
        host,
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

  const organizationJsonLd =
    locale === "sv"
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: config.name,
          url: pageUrl,
          logo: `${PACT_PUBLIC_ORIGIN}/favicon.png`,
          description:
            "Naturvin från flera franska regioner, samlastat på delade pallar och levererat i Sverige där Budbee levererar.",
          areaServed: "Stockholm, Sweden",
          sameAs: ["https://www.instagram.com/pactwines"],
        }
      : {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: config.name,
          url: pageUrl,
          logo: `${PACT_PUBLIC_ORIGIN}/favicon.png`,
          description:
            "Natural wine from several French regions, consolidated on shared pallets.",
          areaServed: "Stockholm, Sweden",
          sameAs: ["https://www.instagram.com/pactwines"],
        };

  const websiteJsonLd =
    locale === "sv"
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: config.name,
          url: pageUrl,
          description:
            "Naturvin från Frankrike, levererat i Sverige där Budbee levererar.",
        }
      : {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: config.name,
          url: pageUrl,
          description: "Natural wine from the regions of France.",
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
