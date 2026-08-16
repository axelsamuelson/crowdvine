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
import { getLabelPosition } from "../lib/utils";
import { Product } from "../lib/shopify/types";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/site-config";
import { getHomepageHeroImages } from "@/lib/actions/content";
import { getHomepageHeroCopy } from "@/lib/get-homepage-hero-copy";

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const isDirtyWine = config.name === "Dirty Wine";
  const title = isDirtyWine
    ? "Dirty Wine — Naturvin från Languedoc, B2B import Stockholm"
    : "PACT Wines — Köp naturvin online direkt från Languedoc";
  const description = isDirtyWine
    ? "Naturvin från Languedoc för restauranger och sommelierer i Stockholm. Direktimport utan grossist. B2B-priser exkl. moms."
    : "Köp naturvin direktimporterat från småproducenter i Languedoc. Hemleverans i Stockholm. Inga mellanhänder — lägre pris, mer karaktär.";

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: config.baseUrl,
      languages: {
        sv: "https://pactwines.com",
        en: "https://pactwines.com",
        "x-default": "https://pactwines.com",
      },
    },
    openGraph: {
      title,
      description,
      url: config.baseUrl,
      type: "website",
    },
  };
}

export default async function Home() {
  const [h, config, shoppingContext] = await Promise.all([
    headers(),
    getSiteConfig(),
    getShoppingContextFromRequest().catch(() => fallbackShoppingContext()),
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
    getQuizWines(shoppingContext.locale).catch((error) => {
      console.warn("Failed to fetch taste quiz wines:", error);
      return [] as Awaited<ReturnType<typeof getQuizWines>>;
    }),
    getProducts({
      limit: 5,
      sortKey: "CREATED_AT",
      reverse: true,
      host,
      ...productCurrencyParams,
    }).catch((error) => {
      console.error("Error fetching featured products:", error);
      return [] as Product[];
    }),
    getHomepageHeroImages().catch(() => undefined),
    getHomepageHeroCopy(shoppingContext.locale).catch(() => undefined),
  ]);

  let featuredProducts = featuredProductsRaw;
  if (featuredProducts.length === 0) {
    try {
      const allProducts = await getProducts({ host, ...productCurrencyParams });
      featuredProducts = allProducts.slice(0, 8);
    } catch (fallbackError) {
      console.error("Error fetching fallback products:", fallbackError);
      featuredProducts = [];
    }
  }

  const [lastProduct, ...restProducts] = featuredProducts;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.name,
    url: config.baseUrl,
    logo: `${config.baseUrl}/favicon.png`,
    description:
      "Direktimport av naturvin från Languedoc till Stockholm. Inga mellanhänder, lägre pris, bättre vin.",
    areaServed: "Stockholm, Sweden",
    sameAs: ["https://www.instagram.com/pactwines"],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.name,
    url: config.baseUrl,
    description: "Naturvin direkt från Languedoc till Stockholm.",
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
          {featuredProducts.length > 0 && (
            <HomeHero images={heroImages} copy={heroCopy} />
          )}
          {quizWines.length > 0 && (
            <HomeTasteQuizCollapsible
              wines={quizWines}
              locale={shoppingContext.locale}
            />
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
                />

                {restProducts.map((product: any, index: number) => (
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
