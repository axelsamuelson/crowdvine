import { Suspense, type ReactNode } from "react";
import { CartSourceProviderConditional } from "@/components/cart/cart-source-provider-conditional";
import { AddToCartConditional } from "@/components/cart/add-to-cart-conditional";
import { PageLayout } from "@/components/layout/page-layout";
import { PalletStatusBar } from "@/components/pdp/pallet-status-bar";
import { PalletZoneStatusProvider } from "@/components/pdp/pallet-zone-status-provider";
import Prose from "@/components/prose";
import { ProductBreadcrumbs } from "@/components/product/product-breadcrumbs";
import { ProductPriceInfoBox } from "@/components/product/product-price-info-box";
import { StockBadge } from "@/components/product/stock-badge";
import { WineEnrichmentSpecs } from "@/components/product/wine-enrichment-specs";
import { hasEnrichmentSpecs } from "@/lib/product/wine-enrichment";
import { WinePdpEnrichment } from "@/components/product/wine-pdp-enrichment";
import { WINE_ENRICHMENT_DROPDOWN_LIST_CLASS } from "@/components/product/wine-enrichment-collapsible";
import { PdpHeroBadges } from "@/components/pdp/pdp-hero-badges";
import { WinePdpHeroBox } from "@/components/product/wine-pdp-hero-box";
import {
  CompetitorOffersSection,
  type CompetitorOffer,
} from "@/components/product/competitor-offers-section";
import { MobileGallerySlider } from "@/app/product/[handle]/components/mobile-gallery-slider";
import { DesktopGallery } from "@/app/product/[handle]/components/desktop-gallery";
import { DesktopGalleryWrapper } from "@/app/product/[handle]/components/desktop-gallery-wrapper";
import { ProductHeroPrice } from "@/app/product/[handle]/components/product-hero-price";
import { PdpRecommendationsSection } from "@/components/product/pdp-recommendations-section";
import type { PdpRecommendationsResult } from "@/lib/product/recommendations";
import type { Product } from "@/lib/shopify/types";

interface ProductPdpLayoutProps {
  product: Product;
  competitorOffers?: CompetitorOffer[];
  recommendations?: PdpRecommendationsResult | null;
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
  competitorOffers = [],
  recommendations = null,
  compareAtPrice,
  beforeSidebar,
  devPreview,
  addToCartPreviewDisabled = false,
}: ProductPdpLayoutProps) {
  return (
    <CartSourceProviderConditional>
      <PageLayout className="bg-muted" noPadding>
        {devPreview}

        <div className="flex min-h-max flex-col md:grid md:grid-cols-12 md:gap-sides">
          <div className="col-span-full h-[60vh] min-h-[400px] md:hidden">
            <Suspense fallback={null}>
              <MobileGallerySlider product={product} />
            </Suspense>
          </div>

          <div className="sticky top-0 col-span-5 flex min-h-max flex-col max-md:static max-md:col-span-full max-md:p-sides md:h-screen md:pl-sides md:pt-top-spacing 2xl:col-span-4">
            <div className="col-span-full">
              <ProductBreadcrumbs
                title={product.title}
                producerName={product.producerName}
                productType={product.productType}
              />

              <PalletZoneStatusProvider productHandle={product.handle}>
                <div className="col-span-full flex flex-col gap-4 max-md:order-2 md:mb-10">
                  <WinePdpHeroBox
                    title={product.title}
                    leadText={product.summary || product.description}
                    topLeftBadges={<PdpHeroBadges />}
                    showCaseHelp={
                      product.productType === "wine" && Boolean(product.producerId)
                    }
                    price={
                      <ProductHeroPrice
                        product={product}
                        className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
                      />
                    }
                    compareAtPrice={compareAtPrice}
                  />
                  <div className="w-full space-y-3">
                    <PalletStatusBar />
                    <AddToCartConditional
                      product={product}
                      className="w-full"
                      previewDisabled={addToCartPreviewDisabled}
                    />
                    {product.productType === "wine" &&
                    hasEnrichmentSpecs(
                      product.wineEnrichment,
                      undefined,
                      product.producerName,
                    ) ? (
                      <WineEnrichmentSpecs
                        enrichment={product.wineEnrichment}
                        producerName={product.producerName}
                      />
                    ) : null}
                    <StockBadge
                      b2bStock={product.b2bStock}
                      availableForSale={product.availableForSale}
                    />
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
                </div>
              </PalletZoneStatusProvider>
            </div>

            {beforeSidebar}
          </div>

          <DesktopGalleryWrapper>
            <Suspense fallback={null}>
              <DesktopGallery product={product} />
            </Suspense>
          </DesktopGalleryWrapper>
        </div>

        {recommendations && recommendations.items.length > 0 ? (
          <PdpRecommendationsSection recommendations={recommendations} />
        ) : null}
      </PageLayout>
    </CartSourceProviderConditional>
  );
}
