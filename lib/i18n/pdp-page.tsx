import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductViewTracker } from "@/app/product/[handle]/components/product-view-tracker";
import { ProductPdpLayout } from "@/components/product/product-pdp-layout";
import { WineBoxDiscountInfo } from "@/components/products/wine-box-discount-info";
import {
  fetchCachedProductForLocale,
  getPdpRequestHost,
} from "@/lib/crowdvine/pdp-product-cache";
import { isProductPdpIndexable } from "@/lib/seo/product-indexable";
import { fetchPdpRecommendationsForWine } from "@/lib/crowdvine/pdp-recommendations-data";
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
import { getSiteConfig } from "@/lib/site-config";
import { formatPrice } from "@/lib/shopify/utils";
import type { Product } from "@/lib/shopify/types";

function getVintageFromTitle(title: string | null | undefined): number | null {
  if (!title || typeof title !== "string") return null;
  const match = title.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

export async function fetchProductForLocale(
  handle: string,
  locale: AppLocale,
): Promise<Product | null> {
  const host = await getPdpRequestHost();
  return fetchCachedProductForLocale(handle, locale, host);
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
  const existingOpenGraph = url
    ? {
        images: [
          {
            url,
            width,
            height,
            alt,
          },
        ],
      }
    : {};

  return {
    title: product.seo.title || product.title,
    description: product.seo.description || product.description,
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
        sv: urls.sv,
        en: urls.en,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      ...existingOpenGraph,
      title: product.seo.title || product.title,
      description: product.seo.description || product.description || "",
      url: canonical,
      type: "website",
    },
  };
}

export async function renderProductPdpPage(options: {
  handle: string;
  locale: AppLocale;
  pathSegment: ProductPathSegment;
}) {
  const { handle, locale, pathSegment } = options;
  const host = await getPdpRequestHost();
  const [product, config] = await Promise.all([
    fetchCachedProductForLocale(handle, locale, host),
    getSiteConfig(),
  ]);

  if (!product) notFound();

  const productUrl = `${PACT_PUBLIC_ORIGIN}${productPagePath(handle, pathSegment)}`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.seo?.description || product.description || "",
    image:
      product.featuredImage?.url ??
      `${config.baseUrl}/pact-og-uploaded.jpg`,
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: product.producerName || config.name,
    },
    offers: {
      "@type": "Offer",
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: product.currencyCode,
      price: product.priceRange.minVariantPrice.amount,
      url: productUrl,
      seller: {
        "@type": "Organization",
        name: config.name,
        sameAs: ["https://www.instagram.com/pactwines"],
      },
    },
    ...(product.wineEnrichment && {
      additionalProperty: [
        product.wineEnrichment.grapeVarieties?.length
          ? {
              "@type": "PropertyValue",
              name: "Grape variety",
              value: product.wineEnrichment.grapeVarieties.join(", "),
            }
          : null,
        product.wineEnrichment.appellation
          ? {
              "@type": "PropertyValue",
              name: "Appellation",
              value: product.wineEnrichment.appellation,
            }
          : null,
        product.wineEnrichment.abv
          ? {
              "@type": "PropertyValue",
              name: "Alcohol",
              value: product.wineEnrichment.abv,
            }
          : null,
        product.wineEnrichment.farming
          ? {
              "@type": "PropertyValue",
              name: "Farming",
              value: product.wineEnrichment.farming,
            }
          : null,
      ].filter(
        (
          item,
        ): item is { "@type": "PropertyValue"; name: string; value: string } =>
          item != null,
      ),
    }),
  };

  const producerName =
    product.productType === "wine" ? (product.producerName?.trim() ?? "") : "";
  const producerWinesLabel = producerName
    ? translate(locale, "product.pdp.breadcrumbProducerWines", {
        producer: producerName,
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
              name: producerWinesLabel ?? producerName,
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

  let competitorOffers: Array<{
    price_source_name: string | null;
    pdp_url: string;
    price_amount_sek: number | null;
    vintage: number | null;
    rating: number | null;
  }> = [];

  if (product.productType === "wine" && product.id) {
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
      const rateMap: Record<string, number> = { SEK: 1 };
      if (currencies.length > 0) {
        const base = getAppUrl();
        const internalHeaders = getInternalFetchHeaders();
        await Promise.all(
          currencies.map(async (c) => {
            try {
              const res = await fetch(
                `${base}/api/exchange-rates?from=${c}&to=SEK`,
                { cache: "no-store", headers: internalHeaders },
              );
              const data = res.ok ? await res.json() : null;
              if (data?.rate && Number.isFinite(data.rate)) {
                rateMap[c] = data.rate;
              }
            } catch {
              /* ignore */
            }
          }),
        );
      }
      competitorOffers = approved.map((o) => {
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
      competitorOffers = [];
    }
  }

  const recommendations =
    product.productType === "wine"
      ? await fetchPdpRecommendationsForWine(product, { host }).catch(() => ({
          sameProducer: [],
          similar: [],
          items: [],
        }))
      : null;

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
        competitorOffers={competitorOffers}
        recommendations={recommendations}
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
