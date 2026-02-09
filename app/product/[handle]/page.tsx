import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getCollection,
  getProduct,
  getProducts,
  getCollectionProducts,
} from "@/lib/shopify";
import { HIDDEN_PRODUCT_TAG } from "@/lib/constants";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { SidebarLinks } from "@/components/layout/sidebar/product-sidebar-links";
import { AddToCart, AddToCartButton } from "@/components/cart/add-to-cart";
import { AddToCartWithSource } from "@/components/cart/add-to-cart-with-source";
import { storeCatalog } from "@/lib/shopify/constants";
import Prose from "@/components/prose";
import { formatPrice } from "@/lib/shopify/utils";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layout/page-layout";
import { ProductPriceDisplay } from "./components/product-price-display";
import { ProductPriceInfoBox } from "@/components/product/product-price-info-box";
import { VariantSelectorSlots } from "./components/variant-selector-slots";
import { MobileGallerySlider } from "./components/mobile-gallery-slider";
import { DesktopGallery } from "./components/desktop-gallery";
import { DesktopGalleryWrapper } from "./components/desktop-gallery-wrapper";
import { WineBoxDiscountInfo } from "@/components/products/wine-box-discount-info";
import { ProductViewTracker } from "./components/product-view-tracker";
import { StockBadge } from "@/components/product/stock-badge";
import { CartSourceProvider } from "@/components/cart/cart-source-context";

// Generate static params for all products at build time
export async function generateStaticParams() {
  // Temporarily disabled for Vercel deployment
  // TODO: Re-enable when Shopify API is accessible during build
  return [];
}

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const { url, width, height, altText: alt } = product.featuredImage || {};
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);

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
    openGraph: url
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
      : null,
  };
}

export default async function ProductPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const params = await props.params;
  const product = await getProduct(params.handle);

  if (!product) return notFound();

  const collection = product.categoryId
    ? await getCollection(product.categoryId)
    : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.featuredImage.url,
    offers: {
      "@type": "AggregateOffer",
      availability: product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      priceCurrency: product.currencyCode,
      highPrice: product.priceRange.maxVariantPrice.amount,
      lowPrice: product.priceRange.minVariantPrice.amount,
    },
  };

  const [rootParentCategory] = collection?.parentCategoryTree.filter(
    (c: any) => c.id !== storeCatalog.rootCategoryId,
  ) ?? [undefined];

  const hasVariants = product.variants.length > 1;
  const hasEvenOptions = product.options.length % 2 === 0;

  return (
    <CartSourceProvider>
      <PageLayout className="bg-muted" noPadding={true}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />

      <ProductViewTracker product={product} />

      <div className="flex flex-col md:grid md:grid-cols-12 md:gap-sides min-h-max">
        {/* Mobile Gallery Slider */}
        <div className="md:hidden col-span-full h-[60vh] min-h-[400px]">
          <Suspense fallback={null}>
            <MobileGallerySlider product={product} />
          </Suspense>
        </div>

        <div className="flex sticky top-0 flex-col col-span-5 2xl:col-span-4 max-md:col-span-full md:h-screen min-h-max max-md:p-sides md:pl-sides md:pt-top-spacing max-md:static">
          <div className="col-span-full">
            <Breadcrumb className="col-span-full mb-4 md:mb-8">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/shop" prefetch>
                      Shop
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {product.productType === "wine-box" ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href="/shop/wine-boxes" prefetch>
                          Wine Boxes
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                ) : rootParentCategory ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href={`/shop/${rootParentCategory.id}`} prefetch>
                          {rootParentCategory.name}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                ) : null}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex flex-col col-span-full gap-4 md:mb-10 max-md:order-2">
              <div className="flex flex-col grid-cols-2 px-3 py-2 rounded-md bg-popover md:grid md:gap-x-4 md:gap-y-10 place-items-baseline">
                {/* Row 1, Col 1: Title + Producer */}
                <div className="md:col-start-1 md:row-start-1">
                  <h1 className="text-lg font-semibold lg:text-xl 2xl:text-2xl text-balance max-md:mb-1">
                    {product.title}
                  </h1>
                  {product.producerName && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {product.producerName}
                    </p>
                  )}
                  <StockBadge
                    b2bStock={product.b2bStock}
                    availableForSale={product.availableForSale}
                    className="mt-0.5"
                  />
                </div>

                {/* Row 1, Col 2: Description */}
                <p className="text-sm font-medium md:col-start-2 md:row-start-1">
                  {product.description}
                </p>

                {/* Row 2, Col 1: Price only; breakdown is in separate box below */}
                <div className="flex gap-3 items-center text-lg font-semibold lg:text-xl 2xl:text-2xl max-md:mt-4 md:col-start-1 md:row-start-2">
                  <ProductPriceDisplay
                    product={product}
                    className="text-lg font-semibold lg:text-xl 2xl:text-2xl"
                  />
                  {product.compareAtPrice && (
                    <span className="line-through opacity-30">
                      {formatPrice(
                        product.compareAtPrice.amount,
                        product.compareAtPrice.currencyCode,
                      )}
                    </span>
                  )}
                </div>

                {/* Add to Cart placed under producer name inside the white box */}
                <div className="col-span-full w-full mt-4">
                  <AddToCartWithSource product={product} className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Suspense
                  fallback={
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  }
                >
                  <VariantSelectorSlots product={product} />
                </Suspense>
              </div>
              {/* Price info in its own white box under grape varieties / color */}
              <ProductPriceInfoBox product={product} />
            </div>
          </div>

          <Prose
            className="col-span-full mb-auto opacity-70 max-md:order-3 max-md:my-6"
            html={product.descriptionHtml}
          />

          <WineBoxDiscountInfo product={product} />

          <SidebarLinks className="flex-col-reverse max-md:hidden py-sides w-full max-w-[408px] pr-sides max-md:pr-0 max-md:py-0" />
        </div>

        {/* Desktop Gallery */}
        <DesktopGalleryWrapper>
          <Suspense fallback={null}>
            <DesktopGallery product={product} />
          </Suspense>
        </DesktopGalleryWrapper>
      </div>
    </PageLayout>
    </CartSourceProvider>
  );
}
