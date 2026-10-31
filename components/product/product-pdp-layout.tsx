import { Suspense, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { CartSourceProviderConditional } from "@/components/cart/cart-source-provider-conditional";
import { CtaVisibleTracker } from "@/components/analytics/cta-visible-tracker";
import { AddToCartConditional } from "@/components/cart/add-to-cart-conditional";
import { DirectBoxDeliveryPromise } from "@/components/commerce/direct-box-delivery-promise";
import { MinSixBottlesHint } from "@/components/commerce/min-six-bottles-hint";
import { ServerListPrice } from "@/components/commerce/server-list-price";
import { PageLayoutServer } from "@/components/layout/page-layout-server";
import { PalletStatusBar } from "@/components/pdp/pallet-status-bar";
import { PalletZoneStatusProvider } from "@/components/pdp/pallet-zone-status-provider";
import Prose from "@/components/prose";
import { ProductBreadcrumbs } from "@/components/product/product-breadcrumbs";
import { ProductPriceInfoBox } from "@/components/product/product-price-info-box";
import { WineEnrichmentSpecs } from "@/components/product/wine-enrichment-specs";
import { WineStyleScale } from "@/components/product/wine-style-scale";
import { hasEnrichmentSpecs } from "@/lib/product/wine-enrichment";
import { WinePdpEnrichment } from "@/components/product/wine-pdp-enrichment";
import { WINE_ENRICHMENT_DROPDOWN_LIST_CLASS } from "@/components/product/wine-enrichment-collapsible";
import { PdpHeroBadges } from "@/components/pdp/pdp-hero-badges";
import { WinePdpHeroBox } from "@/components/product/wine-pdp-hero-box";
import { WinePdpColorCategoryLink } from "@/components/product/wine-pdp-color-category-link";
import {
  CompetitorOffersSection,
  type CompetitorOffer,
} from "@/components/product/competitor-offers-section";
import { MobileGallerySlider } from "@/app/product/[handle]/components/mobile-gallery-slider";
import { DesktopGallery } from "@/app/product/[handle]/components/desktop-gallery";
import { DesktopGalleryWrapper } from "@/app/product/[handle]/components/desktop-gallery-wrapper";
import { ProductHeroPrice } from "@/app/product/[handle]/components/product-hero-price";
import { PdpSiblingWinesSection } from "@/components/product/pdp-sibling-wines-section";
import { WineProducerMap } from "@/components/product/wine-producer-map";
import { PdpB2BLink } from "@/components/product/pdp-b2b-link";

// Below-fold carousel (framer-motion + ProductCard). Keep enrichment SSR'd in the
// sticky sidebar so deferred mount does not inflate desktop CLS.
const PdpRecommendationsSection = dynamic(
  () =>
    import("@/components/product/pdp-recommendations-section").then(
      (m) => m.PdpRecommendationsSection,
    ),
  { loading: () => null },
);
import type { PdpRecommendationsResult } from "@/lib/product/recommendations";
import { pickPdpSiblingWines } from "@/lib/product/pdp-sibling-wines";
import type { AppLocale } from "@/lib/i18n/locale";
import type { ZoneStatusPayload } from "@/lib/pallet/zone-status";
import { generateProducerSlug } from "@/lib/producer-handle";
import type { Product } from "@/lib/shopify/types";

interface ProductPdpLayoutProps {
  product: Product;
  locale?: AppLocale;
  competitorOffers?: CompetitorOffer[];
  recommendations?: PdpRecommendationsResult | null;
  /** SSR pallet fill snapshot for no-JS / first paint. */
  initialPalletStatus?: ZoneStatusPayload | null;
  compareAtPrice?: ReactNode;
  /** e.g. WineBoxDiscountInfo for wine-box products */
  beforeSidebar?: ReactNode;
  /** Dev preview banner above the grid */
  devPreview?: ReactNode;
  /** Disable add-to-cart on dev preview pages */
  addToCartPreviewDisabled?: boolean;
}

export function ProductPdpLayout({
  product,
  locale = "en",
  competitorOffers = [],
  recommendations = null,
  initialPalletStatus = null,
  compareAtPrice,
  beforeSidebar,
  devPreview,
  addToCartPreviewDisabled = false,
}: ProductPdpLayoutProps) {
  const showProducerMap =
    product.productType === "wine" &&
    Boolean(product.producerName) &&
    Boolean(
      product.producerLocation?.lat ||
        product.producerLocation?.lon ||
        product.producerLocation?.subregion ||
        product.producerLocation?.region,
    );

  const producerMap = showProducerMap ? (
    <WineProducerMap
      producer={{
        name: product.producerName ?? "Producent",
        lat: product.producerLocation?.lat,
        lon: product.producerLocation?.lon,
        subregion: product.producerLocation?.subregion,
        region: product.producerLocation?.region,
      }}
    />
  ) : null;

  const producerSlug =
    product.producerName?.trim() &&
    product.producerName.trim() !== "Unknown Producer"
      ? generateProducerSlug(product.producerName)
      : null;

  const siblingWines =
    product.productType === "wine" && recommendations?.sameProducer?.length
      ? pickPdpSiblingWines(
          product,
          recommendations.sameProducer.map((r) => r.product),
          3,
        )
      : [];

  return (
    <CartSourceProviderConditional>
      <PageLayoutServer className="bg-background" noPadding>
        {devPreview}

        <div className="flex min-h-max flex-col md:grid md:grid-cols-12 md:gap-sides">
          <div className="col-span-full md:hidden">
            <div className="h-[60vh] min-h-[400px]">
              <Suspense fallback={null}>
                <MobileGallerySlider product={product} />
              </Suspense>
            </div>
          </div>

          <div className="sticky top-0 col-span-5 flex min-h-max flex-col max-md:static max-md:col-span-full max-md:p-sides md:h-screen md:pl-sides md:pt-top-spacing 2xl:col-span-4">
            <div className="col-span-full">
              <ProductBreadcrumbs
                title={product.title}
                producerName={product.producerName}
                productType={product.productType}
                className="md:pt-4"
              />

              <PalletZoneStatusProvider
                productHandle={product.handle}
                initialData={initialPalletStatus}
              >
                <div className="col-span-full flex flex-col gap-4 max-md:order-2 md:mb-10">
                  <WinePdpHeroBox
                    title={product.title}
                    leadText={product.summary || product.description}
                    producerName={product.producerName}
                    producerSlug={producerSlug}
                    locale={locale}
                    topLeftBadges={
                      <PdpHeroBadges
                        b2bStock={product.b2bStock}
                        availableForSale={product.availableForSale}
                        b2bAvailability={product.b2bAvailability}
                        b2bIsNew={product.b2bIsNew}
                      />
                    }
                    showCaseHelp={
                      product.productType === "wine" && Boolean(product.producerId)
                    }
                    price={
                      <>
                        <noscript>
                          <ServerListPrice
                            product={product}
                            locale={locale}
                            className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
                          />
                        </noscript>
                        <ProductHeroPrice
                          product={product}
                          className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
                        />
                      </>
                    }
                    compareAtPrice={compareAtPrice}
                  />
                  <div className="w-full space-y-3">
                    {product.productType === "wine" ? (
                      <MinSixBottlesHint locale={locale} />
                    ) : null}
                    {/* SSR direct-box promise; client PalletStatusBar keeps analytics. */}
                    <noscript>
                      <DirectBoxDeliveryPromise locale={locale} />
                    </noscript>
                    <PalletStatusBar />
                    <CtaVisibleTracker productId={product.id} className="w-full">
                      <AddToCartConditional
                        product={product}
                        className="w-full"
                        previewDisabled={addToCartPreviewDisabled}
                        ctaAside={
                          product.productType === "wine" ? (
                            <PdpB2BLink locale={locale} />
                          ) : null
                        }
                      />
                    </CtaVisibleTracker>
                    {product.productType === "wine" &&
                    (
                      hasEnrichmentSpecs(
                        product.wineEnrichment,
                        undefined,
                        product.producerName,
                      ) ||
                      (product.wineEnrichment?.taste_tags?.length ?? 0) > 0
                    ) ? (
                      <WineEnrichmentSpecs
                        enrichment={product.wineEnrichment}
                        producerName={product.producerName}
                      />
                    ) : null}
                    {product.wineEnrichment?.style_scale != null &&
                    product.wineEnrichment.style_scale >= 1 &&
                    product.wineEnrichment.style_scale <= 5 ? (
                      <WineStyleScale value={product.wineEnrichment.style_scale} />
                    ) : null}
                  </div>

                  {product.productType !== "wine" && product.descriptionHtml ? (
                    <Prose
                      className="col-span-full opacity-70 max-md:order-3"
                      html={product.descriptionHtml}
                    />
                  ) : null}

                  <div className={WINE_ENRICHMENT_DROPDOWN_LIST_CLASS}>
                    {product.productType === "wine" && product.wineEnrichment ? (
                      <WinePdpEnrichment enrichment={product.wineEnrichment} />
                    ) : null}

                    <ProductPriceInfoBox product={product} />
                    <CompetitorOffersSection offers={competitorOffers} />
                  </div>

                  {product.productType === "wine" ? (
                    <div className="pt-1">
                      <WinePdpColorCategoryLink
                        locale={locale}
                        color={product.wineEnrichment?.color}
                        farming={
                          product.farming ?? product.wineEnrichment?.farming
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </PalletZoneStatusProvider>
            </div>

            {beforeSidebar}
          </div>

          <DesktopGalleryWrapper>
            <Suspense fallback={null}>
              <DesktopGallery product={product} />
            </Suspense>
            {producerMap ? (
              <div className="pb-sides pt-4 max-md:hidden">
                {producerMap}
              </div>
            ) : null}
          </DesktopGalleryWrapper>
        </div>

        {producerMap ? (
          <div className="md:hidden">{producerMap}</div>
        ) : null}

        {siblingWines.length > 0 && product.producerName ? (
          <PdpSiblingWinesSection
            producerName={product.producerName}
            locale={locale}
            wines={siblingWines}
          />
        ) : null}

        {recommendations &&
        (recommendations.sameProducer.length > 0 ||
          recommendations.similar.length > 0) ? (
          <PdpRecommendationsSection recommendations={recommendations} />
        ) : null}
      </PageLayoutServer>
    </CartSourceProviderConditional>
  );
}
