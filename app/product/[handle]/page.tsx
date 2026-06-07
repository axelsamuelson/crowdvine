import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProduct } from "@/lib/shopify";
import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import { formatPrice } from "@/lib/shopify/utils";
import { ProductPdpLayout } from "@/components/product/product-pdp-layout";
import { WineBoxDiscountInfo } from "@/components/products/wine-box-discount-info";
import { ProductViewTracker } from "./components/product-view-tracker";
import { getOffersByWineId } from "@/lib/external-prices/db";
import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";
import { fetchPdpRecommendationsForWine } from "@/lib/crowdvine/pdp-recommendations-data";
import { headers } from "next/headers";

// Generate static params for all products at build time
export async function generateStaticParams() {
  // Temporarily disabled for Vercel deployment
  // TODO: Re-enable when Shopify API is accessible during build
  return [];
}

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

/** Extract vintage year from a title string (e.g. "Pachorra 2023" or competitor title → 2023). */
function getVintageFromTitle(title: string | null | undefined): number | null {
  if (!title || typeof title !== "string") return null;
  const match = title.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);
  const handle = params.handle;
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
      canonical: `https://pactwines.com/product/${handle}`,
    },
    openGraph: {
      ...existingOpenGraph,
      title: product.seo.title || product.title,
      description: product.seo.description || product.description || "",
      url: `https://pactwines.com/product/${handle}`,
      type: "website",
    },
  };
}

export default async function ProductPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  const handle = params.handle;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.seo?.description || product.description || "",
    image: product.featuredImage?.url,
    url: `https://pactwines.com/product/${handle}`,
    brand: {
      "@type": "Brand",
      name: product.producerName || "PACT",
    },
    offers: {
      "@type": "Offer",
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: product.currencyCode,
      price: product.priceRange.minVariantPrice.amount,
      url: `https://pactwines.com/product/${handle}`,
      seller: {
        "@type": "Organization",
        name: "PACT",
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
      ].filter((item): item is { "@type": "PropertyValue"; name: string; value: string } =>
        item != null,
      ),
    }),
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
        const headers = getInternalFetchHeaders();
        await Promise.all(
          currencies.map(async (c) => {
            try {
              const res = await fetch(
                `${base}/api/exchange-rates?from=${c}&to=SEK`,
                { cache: "no-store", headers },
              );
              const data = res.ok ? await res.json() : null;
              if (data?.rate && Number.isFinite(data.rate)) rateMap[c] = data.rate;
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
