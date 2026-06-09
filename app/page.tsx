import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { HomeLatestDropBadge } from "@/components/home/home-latest-drop-badge";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import type { Metadata } from "next";
import {
  getCollectionProducts,
  getCollections,
  getProducts,
} from "@/lib/shopify";
import { getLabelPosition } from "../lib/utils";
import { Product } from "../lib/shopify/types";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/site-config";

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const isDirtyWine = config.name === "Dirty Wine";
  const title = isDirtyWine
    ? "Dirty Wine — Naturvin från Languedoc, B2B import Stockholm"
    : "PACT — Köp naturvin online direkt från Languedoc";
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
  const [h, config] = await Promise.all([headers(), getSiteConfig()]);
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const shoppingContext = await getShoppingContextFromRequest().catch(() =>
    fallbackShoppingContext(),
  );
  const productCurrencyParams = {
    displayCurrencyCode: shoppingContext.currencyCode,
    sekToDisplayRate: shoppingContext.sekToDisplayRate,
  };

  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in home page:", error);
    collections = [];
  }

  let featuredProducts: Product[] = [];

  try {
    if (collections.length > 0) {
      // Get the 5 most recent products from all producers
      featuredProducts = await getProducts({
        limit: 5,
        sortKey: "CREATED_AT",
        reverse: true,
        host,
        ...productCurrencyParams,
      });
    } else {
      const allProducts = await getProducts({ host, ...productCurrencyParams });
      featuredProducts = allProducts.slice(0, 8);
    }
  } catch (error) {
    console.error("Error fetching featured products:", error);
    // Fallback to all products if collection products fail
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
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${config.baseUrl}/vin?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
        <div className="contents md:grid md:grid-cols-12 md:gap-sides">
          <HomeSidebar collections={collections} />
          <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
            <div className="fixed top-0 left-0 z-10 w-full pointer-events-none base-grid py-sides">
              <div className="col-span-8 col-start-5">
                <div className="hidden px-6 lg:block">
                  <HomeLatestDropBadge />
                </div>
              </div>
            </div>
            {featuredProducts.length > 0 && (
              <>
                <LatestProductCard
                  className="col-span-2"
                  product={lastProduct}
                  principal
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
