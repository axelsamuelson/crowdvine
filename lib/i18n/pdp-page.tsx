import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductViewTracker } from "@/app/product/[handle]/components/product-view-tracker";
import { ProductPdpLayout } from "@/components/product/product-pdp-layout";
import { PdpRecommendationsAsync } from "@/components/product/pdp-recommendations-async";
import { WineBoxDiscountInfo } from "@/components/products/wine-box-discount-info";
import { fetchCachedProductForLocale } from "@/lib/crowdvine/pdp-product-cache";
import { fetchPdpRecommendationsForWine } from "@/lib/crowdvine/pdp-recommendations-data";
import { buildDirectBoxUiAvailability } from "@/lib/commerce/direct-box-ui-contract";
import { getCachedExchangeRateMap } from "@/lib/exchange-rates/cached-rate";
import { isProductPdpIndexable } from "@/lib/seo/product-indexable";
import { buildProductPdpJsonLd } from "@/lib/seo/product-json-ld";
import { getOffersByWineId } from "@/lib/external-prices/db";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  PACT_PUBLIC_ORIGIN,
  producerShopPathFromName,
  productPagePath,
  productPageUrls,
  shopPathForLocale,
  type ProductPathSegment,
} from "@/lib/i18n/localized-routes";
import { translate } from "@/lib/i18n/messages";
import { producerDisplayName } from "@/lib/producer-display-name";
import {
  DEFAULT_OG_IMAGE_URL,
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getPublicSiteConfig } from "@/lib/site-config-server";
import { formatPrice } from "@/lib/shopify/utils";
import type { Product } from "@/lib/shopify/types";

function getVintageFromTitle(title: string | null | undefined): number | null {
  if (!title || typeof title !== "string") return null;
  const match = title.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

/** Anonymous B2C host for ISR — Dirtywine hydrates client-side. */
const PDP_ISR_HOST: string | null = null;

export async function fetchProductForLocale(
  handle: string,
  locale: AppLocale,
): Promise<Product | null> {
  return fetchCachedProductForLocale(handle, locale, PDP_ISR_HOST);
}

export async function buildProductPdpMetadata(
  handle: string,
  locale: AppLocale,
  pathSegment: ProductPathSegment,
): Promise<Metadata> {
  const product = await fetchProductForLocale(handle, locale);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = isProductPdpIndexable({
    tags: product.tags,
    catalogAvailableForSale: product.catalogAvailableForSale,
  });
  const urls = productPageUrls(handle);
  const canonical = `${PACT_PUBLIC_ORIGIN}${productPagePath(handle, pathSegment)}`;
  const title = product.seo.title || product.title;
  const description = product.seo.description || product.description || "";
  const config = getPublicSiteConfig();
  const ogImages = url
    ? [
        {
          url,
          width,
          height,
          alt: alt || title,
        },
      ]
    : defaultOpenGraphImages({ siteName: config.siteName, locale });

  return {
    title,
    description: description || undefined,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
      },
    },
    alternates: {
      canonical,
      languages: {
        "sv-SE": urls.sv,
        en: urls.en,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: locale === "sv" ? "sv_SE" : "en_US",
      images: ogImages,
    },
    twitter: pageTwitterCard(
      title,
      description,
      url || DEFAULT_OG_IMAGE_URL,
    ),
  };
}

type CompetitorOfferRow = {
  price_source_name: string | null;
  pdp_url: string;
  price_amount_sek: number | null;
  vintage: number | null;
  rating: number | null;
};

async function loadCompetitorOffers(
  product: Product,
): Promise<CompetitorOfferRow[]> {
  if (product.productType !== "wine" || !product.id) return [];

  try {
    const offers = await getOffersByWineId(product.id);
    const approved = offers.filter((o) => (o.match_confidence ?? 0) >= 0.4);
    const currencies = [
      ...new Set(
        approved
          .map((o) => (o.currency ?? "SEK").toUpperCase())
          .filter((c) => c && c !== "SEK"),
      ),
    ];
    const rateMap = await getCachedExchangeRateMap(currencies, "SEK");

    return approved.map((o) => {
      const amount = o.price_amount != null ? Number(o.price_amount) : null;
      const currency = (o.currency ?? "SEK").toUpperCase();
      const rate = rateMap[currency] ?? 1;
      const price_amount_sek =
        amount != null ? Math.round(amount * rate * 100) / 100 : null;
      return {
        price_source_name: o.price_source?.name ?? null,
        pdp_url: o.pdp_url,
        price_amount_sek,
        vintage: getVintageFromTitle(o.title_raw),
        rating: o.rating != null ? Number(o.rating) : null,
      };
    });
  } catch {
    return [];
  }
}

export async function renderProductPdpPage(options: {
  handle: string;
  locale: AppLocale;
  pathSegment: ProductPathSegment;
}) {
  const { handle, locale, pathSegment } = options;
  const [product, config] = await Promise.all([
    fetchCachedProductForLocale(handle, locale, PDP_ISR_HOST),
    Promise.resolve(getPublicSiteConfig()),
  ]);

  if (!product) notFound();

  const productUrl = `${PACT_PUBLIC_ORIGIN}${productPagePath(handle, pathSegment)}`;
  const includeB2cReturnPolicy = true;
  const directDeliveryAvailable =
    includeB2cReturnPolicy &&
    buildDirectBoxUiAvailability({ countryCode: "SE" }).deliverySelectable;

  const recommendationsPromise =
    product.productType === "wine"
      ? fetchPdpRecommendationsForWine(product, { host: PDP_ISR_HOST }).catch(
          () => ({
            sameProducer: [],
            similar: [],
            items: [],
          }),
        )
      : Promise.resolve(null);

  // Pallet fill is loaded by PalletZoneStatusProvider from /api/pallet/zone-status
  // so this page render stays a static shell.
  const competitorOffers = await loadCompetitorOffers(product);

  const productJsonLd = buildProductPdpJsonLd({
    title: product.title,
    description: product.seo?.description || product.description || "",
    imageUrl:
      product.featuredImage?.url ??
      `${config.baseUrl}/pact-og-uploaded.jpg`,
    productUrl,
    brandName:
      producerDisplayName({
        name: product.producerName,
        display_name: product.producerDisplayName,
      }) || config.name,
    availableForSale: product.availableForSale,
    directDeliveryAvailable,
    sku: product.handle || product.id,
    ean: null,
    priceCurrency: "SEK",
    price: product.priceRange.minVariantPrice.amount,
    sellerName: config.name,
    wineEnrichment: product.wineEnrichment,
    includeB2cReturnPolicy,
  });

  const producerName =
    product.productType === "wine" ? (product.producerName?.trim() ?? "") : "";
  const shownProducerName = producerName
    ? producerDisplayName({
        name: producerName,
        display_name: product.producerDisplayName,
      })
    : "";
  const producerWinesLabel = shownProducerName
    ? translate(locale, "product.pdp.breadcrumbProducerWines", {
        producer: shownProducerName,
      })
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "sv" ? "Alla viner" : "Shop",
        item: `${config.baseUrl}${shopPathForLocale(locale)}`,
      },
      ...(producerName
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: producerWinesLabel ?? shownProducerName,
              item: `${config.baseUrl}${producerShopPathFromName(producerName, locale)}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: product.title,
              item: productUrl,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: product.title,
              item: productUrl,
            },
          ]),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <ProductViewTracker product={product} />

      <ProductPdpLayout
        product={product}
        locale={locale}
        competitorOffers={competitorOffers}
        belowFold={
          <PdpRecommendationsAsync
            product={product}
            locale={locale}
            host={PDP_ISR_HOST}
            recommendationsPromise={recommendationsPromise}
          />
        }
        compareAtPrice={
          product.compareAtPrice ? (
            <span className="text-lg line-through opacity-30 lg:text-xl 2xl:text-2xl">
              {formatPrice(
                product.compareAtPrice.amount,
                product.compareAtPrice.currencyCode,
              )}
            </span>
          ) : undefined
        }
        beforeSidebar={<WineBoxDiscountInfo product={product} />}
      />
    </>
  );
}