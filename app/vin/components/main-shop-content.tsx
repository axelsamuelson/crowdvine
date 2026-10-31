import Link from "next/link";
import { Suspense } from "react";

import ProductList from "@/app/vin/components/product-list";
import { CategoryFaqSection } from "@/components/shop/category-faq-section";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { getCachedShopProducts } from "@/lib/shop/cached-shop-products";
import { getShopRootNaturalWineContent } from "@/lib/shop/shop-root-natural-wine-content";
import {
  DEFAULT_B2C_SHOP_SORT,
  storeCatalog,
} from "@/lib/shopify/constants";
import { mapSortKeys } from "@/lib/shopify/utils";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { buildFaqPageJsonLd } from "@/lib/wine-category-faq";

async function ShopRootJsonLd({ locale }: { locale: "sv" | "en" }) {
  const content = getShopRootNaturalWineContent(locale);
  const config = getPublicSiteConfig();
  // Anonymous B2C catalog for ISR JSON-LD — no headers()/cookies().
  const { sortKey, reverse } = mapSortKeys(DEFAULT_B2C_SHOP_SORT, "product");
  let rawProducts: Awaited<ReturnType<typeof getCachedShopProducts>> = [];
  try {
    rawProducts = await getCachedShopProducts({
      sortKey,
      reverse,
      isB2BSite: false,
      displayCurrencyCode: "SEK",
      sekToDisplayRate: 1,
      locale,
    });
  } catch (error) {
    // CI builds use placeholder Supabase; keep force-static prerender green.
    console.warn("ShopRootJsonLd: failed to fetch products:", error);
  }
  const mapped = mapProductDataToShopProducts(rawProducts);
  const shopPath = locale === "sv" ? "/vin" : "/wine";
  const productPrefix = locale === "sv" ? "/produkt" : "/product";
  const pageUrl = `${config.baseUrl}${shopPath}`;
  const homeUrl =
    locale === "sv" ? config.baseUrl : `${config.baseUrl}/en`;
  const homeName = locale === "sv" ? "Hem" : "Home";

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: content.h1,
    description: content.intro,
    url: pageUrl,
    numberOfItems: mapped.length,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: homeName,
        item: homeUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: content.h1,
        item: pageUrl,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: content.h1,
    url: pageUrl,
    numberOfItems: mapped.length,
    itemListElement: mapped.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.title,
      url: `${config.baseUrl}${productPrefix}/${product.handle}`,
    })),
  };

  const faqJsonLd =
    content.faq.length > 0 ? buildFaqPageJsonLd(content.faq) : null;

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
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
    </>
  );
}

function ShopRootBelowFold({ locale }: { locale: "sv" | "en" }) {
  const content = getShopRootNaturalWineContent(locale);
  const exploreHref =
    locale === "sv" ? "/vin/rott-naturvin" : "/wine/red-natural-wine";
  const exploreLabel =
    locale === "sv" ? "Rött naturvin" : "Red natural wine";
  const guideHref =
    locale === "sv" ? "/guider/vad-ar-naturvin" : "/guides/what-is-natural-wine";
  const guideLabel =
    locale === "sv" ? "Vad är naturvin?" : "What is natural wine?";
  const deliveryGuideHref =
    locale === "sv"
      ? "/guider/hemleverans-av-naturvin"
      : "/guides/natural-wine-home-delivery";
  const deliveryGuideLabel =
    locale === "sv" ? "Så fungerar hemleverans" : "How home delivery works";
  const tastingHeading =
    locale === "sv" ? "Smakprofil" : "Tasting profile";
  const foodHeading = locale === "sv" ? "Matparning" : "Food pairing";
  const exploreHeading = locale === "sv" ? "Utforska mer" : "Explore more";

  return (
    <div className="p-sides pb-8">
      {content.longDescription ? (
        <div className="mt-16 pt-12">
          <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-stone-400">
            {content.contentHeading}
          </h2>
          <div className="prose prose-stone prose-sm max-w-2xl">
            {content.longDescription.split("\n\n").map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
        </div>
      ) : null}

      {content.tastingProfile.length > 0 ? (
        <div className="mt-12">
          <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-stone-400">
            {tastingHeading}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {content.tastingProfile.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm leading-snug text-stone-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {content.foodPairing ? (
        <div className="mt-12">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-stone-400">
            {foodHeading}
          </h2>
          <p className="max-w-xl text-sm text-stone-600">{content.foodPairing}</p>
        </div>
      ) : null}

      <div className="mt-12 pt-12">
        <div>
          <h3 className="mb-3 text-sm font-medium text-stone-900">
            {exploreHeading}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href={exploreHref}
              className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
            >
              {exploreLabel}
            </Link>
            <Link
              href={guideHref}
              className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
            >
              {guideLabel}
            </Link>
            <Link
              href={deliveryGuideHref}
              className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900"
            >
              {deliveryGuideLabel}
            </Link>
          </div>
        </div>
      </div>

      {content.faq.length > 0 ? (
        <CategoryFaqSection h1={content.h1} locale={locale} faq={content.faq} />
      ) : null}
    </div>
  );
}

export async function MainShopContent({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  locale: "sv" | "en";
}) {
  const sp = await searchParams;
  const content = getShopRootNaturalWineContent(locale);

  return (
    <>
      <Suspense fallback={null}>
        <ShopRootJsonLd locale={locale} />
      </Suspense>
      <div className="p-sides pt-8">
        <div className="mb-8 max-w-2xl">
          <h1 className="mb-3 text-3xl font-medium text-stone-900">
            {content.h1}
          </h1>
          <p className="leading-relaxed text-stone-600">{content.intro}</p>
        </div>
      </div>
      <ProductList
        collection={storeCatalog.rootCategoryId}
        searchParams={sp}
        locale={locale}
      />
      <ShopRootBelowFold locale={locale} />
    </>
  );
}

export { shopSkeleton } from "./main-shop-content-skeleton";
