"use client";

import React, { Suspense, memo, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import { Product } from "@/lib/shopify/types";
import { formatPrice, priceExclVat } from "@/lib/shopify/utils";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { ProductListImage } from "@/app/vin/components/product-list-image";
import { ProductImage } from "./product-image";
import { Badge } from "@/components/ui/badge";
import { MemberPrice } from "@/components/ui/member-price";
import { StockBadge } from "@/components/product/stock-badge";
import { NewBadge } from "@/components/product/new-badge";
import { BoostBadgeSlot } from "@/components/producer/boost-badge";
import { PeekTabAnchor } from "@/components/pdp/peek-tab-anchor";
import type { RecommendationReason } from "@/lib/product/recommendations";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { PriceViewTracker } from "@/components/analytics/price-view-tracker";

const AddToCart = dynamic(
  () => import("@/components/cart/add-to-cart").then((m) => m.AddToCart),
  { loading: () => null },
);
const AddToCartButton = dynamic(
  () => import("@/components/cart/add-to-cart").then((m) => m.AddToCartButton),
  { loading: () => null },
);
const VariantSelector = dynamic(
  () => import("../variant-selector").then((m) => m.VariantSelector),
  { loading: () => null },
);
const ProductCardMembershipTab = dynamic(
  () =>
    import("@/components/product/product-card-membership-tab").then(
      (m) => m.ProductCardMembershipTab,
    ),
  { loading: () => null },
);
const ProductCardRecommendationTab = dynamic(
  () =>
    import("@/components/product/product-card-recommendation-tab").then(
      (m) => m.ProductCardRecommendationTab,
    ),
  { loading: () => null },
);

// ============================================================================
// DEBUG: Scroll isolation flags
// ============================================================================
const DEBUG_SCROLL = false; // Set to true to enable debug mode
const SCROLL_STEP: number = 0; // 0..13: incrementally add back components

// ============================================================================
// ScrollProbe: Runtime wheel event inspector
// ============================================================================
function ScrollProbe() {
  const [wheelPrevented, setWheelPrevented] = useState<boolean | null>(null);
  const [deltaY, setDeltaY] = useState<number>(0);
  const [targetInfo, setTargetInfo] = useState<string>("");
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [hasWheelEvents, setHasWheelEvents] = useState(false);
  const lastScrollTopRef = useRef<number>(0);

  useEffect(() => {
    if (!DEBUG_SCROLL) return;

    const updateScrollTop = () => {
      const scrollingElement = document.scrollingElement || document.documentElement;
      const current = scrollingElement.scrollTop;
      setScrollTop(current);
      lastScrollTopRef.current = current;
      requestAnimationFrame(updateScrollTop);
    };
    updateScrollTop();

    const handleWheel = (e: WheelEvent) => {
      setHasWheelEvents(true);
      setWheelPrevented(e.defaultPrevented);
      setDeltaY(e.deltaY);
      
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const firstClass = target.className && typeof target.className === 'string' 
        ? target.className.split(' ')[0] || 'no-class'
        : 'no-class';
      setTargetInfo(`${tag}.${firstClass}`);
    };

    // Capture phase to catch all events
    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, []);

  if (!DEBUG_SCROLL) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[99999] bg-black/90 text-white text-xs font-mono p-3 rounded-md shadow-lg max-w-xs">
      <div className="font-bold mb-2 border-b border-white/20 pb-1">ScrollProbe</div>
      <div className="space-y-1">
        <div>
          <span className="text-white/70">Wheel Events: </span>
          <span className={hasWheelEvents ? "text-green-400" : "text-red-400"}>
            {hasWheelEvents ? "YES" : "NO"}
          </span>
        </div>
        <div>
          <span className="text-white/70">defaultPrevented: </span>
          <span className={wheelPrevented === true ? "text-red-400" : wheelPrevented === false ? "text-green-400" : "text-yellow-400"}>
            {wheelPrevented === null ? "—" : wheelPrevented.toString()}
          </span>
        </div>
        <div>
          <span className="text-white/70">deltaY: </span>
          <span>{deltaY}</span>
        </div>
        <div>
          <span className="text-white/70">Target: </span>
          <span className="text-yellow-300">{targetInfo || "—"}</span>
        </div>
        <div>
          <span className="text-white/70">scrollTop: </span>
          <span>{Math.round(scrollTop)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-white/50">
          Step: {SCROLL_STEP}
        </div>
      </div>
    </div>
  );
}


export const ProductCard = memo(
  ({
    product,
    index = 0,
    listSearchQuery,
    showMembershipTab = false,
    recommendationReason,
  }: {
    product: Product;
    index?: number;
    /** When set (shop search active), PDP clicks log search_result_clicked. */
    listSearchQuery?: string;
    /** Recommended wines: membership tab peeking above top-left of card. */
    showMembershipTab?: boolean;
    /** Recommended wines: same producer / similar wine tab beside membership tab. */
    recommendationReason?: RecommendationReason;
  }) => {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const productHref = paths.product(product.handle);

  // Check if this is a wine box product
  const productType = (product as { productType?: string }).productType;
  const isWineBox = productType === "wine-box";
  const discountInfo = (product as { discountInfo?: { discountPercentage: number; totalWinePrice: number } }).discountInfo;

  const [, setIsTouched] = useState(false);
  const showExclVat = useB2BPriceMode();
  const showMembershipBadge = !showMembershipTab;
  const listPriceSek = getProductListPriceSek(product);
  const showTopTabs = showMembershipTab || recommendationReason != null;

  // ============================================================================
  // DEBUG: Scroll isolation - strict add-back matrix
  // ============================================================================
  if (DEBUG_SCROLL) {
    switch (SCROLL_STEP) {
      case 0:
        // Minimal: just a div
        return (
          <>
            <ScrollProbe />
            <div className="w-full aspect-[3/4] md:aspect-square bg-gray-300" />
          </>
        );
      
      case 1:
        // + className "group" on root
        return (
          <>
            <ScrollProbe />
            <div className="w-full aspect-[3/4] md:aspect-square bg-gray-300 group" />
          </>
        );
      
      case 2:
        // + root: relative
        return (
          <>
            <ScrollProbe />
            <div className="relative w-full aspect-[3/4] md:aspect-square bg-gray-300 group" />
          </>
        );
      
      case 3:
        // + root: overflow-hidden
        return (
          <>
            <ScrollProbe />
            <div 
              className="relative w-full aspect-[3/4] md:aspect-square bg-gray-300 group overflow-hidden"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
              onWheel={(e) => {
                // Force wheel events to propagate to document by dispatching on parent
                const scrollingElement = document.scrollingElement || document.documentElement;
                scrollingElement.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' });
              }}
            />
          </>
        );
      
      case 4:
        // + empty hover handlers
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-gray-300 group overflow-hidden"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            />
          </>
        );
      
      case 5:
        // + exact production root className (but no children/Link)
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group overflow-hidden"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            />
          </>
        );
      
      case 6:
        // + Link "small" (corner link, NOT wrapping entire card)
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group overflow-hidden"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <Link
                href={productHref}
                className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                prefetch={false}
              >
                Link
              </Link>
            </div>
          </>
        );
      
      case 7:
        // + Link wraps entire card (block size-full) but NO overlay/CTA
        // NOTE: overflow-hidden moved to wrapper (like production) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
            </div>
          </>
        );
      
      case 8:
        // + visual overlay (pointer-events-none always) but NO CTA/buttons
        // NOTE: Using overflow-clip on wrapper (like step 7) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
              <div className="absolute inset-0 p-2 w-full pointer-events-none">
                <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-pretty">{product.title}</p>
                    </div>
                    <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
                      <span>Price</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      
      case 9:
        // + CTA wrappers with DUMMY buttons (no real components)
        // NOTE: Using overflow-clip on wrapper (like step 7-8) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
              <div className="absolute inset-0 p-2 w-full pointer-events-none">
                <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-pretty">{product.title}</p>
                    </div>
                    <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
                      <span>Price</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex absolute bottom-3 right-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <button className="px-4 py-2 bg-black text-white rounded-md">Dummy Button</button>
                </div>
              </div>
            </div>
          </>
        );
      
      case 10:
        // + AddToCartButton only
        // NOTE: Using overflow-clip on wrapper (like step 7-9) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
              <div className="absolute inset-0 p-2 w-full pointer-events-none">
                <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-pretty">{product.title}</p>
                    </div>
                    <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
                      <span>Price</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex absolute bottom-3 right-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <Suspense fallback={<div className="px-4 py-2 bg-gray-400 rounded-md">Loading...</div>}>
                    <AddToCartButton product={product} size="sm" />
                  </Suspense>
                </div>
              </div>
            </div>
          </>
        );
      
      case 11:
        // + AddToCart (full component)
        // NOTE: Using overflow-clip on wrapper (like step 7-10) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
              <div className="absolute inset-0 p-2 w-full pointer-events-none">
                <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-pretty">{product.title}</p>
                    </div>
                    <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
                      <span>Price</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex absolute bottom-3 right-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <Suspense fallback={<div className="px-4 py-2 bg-gray-400 rounded-md">Loading...</div>}>
                    <AddToCart product={product} size="sm" />
                  </Suspense>
                </div>
              </div>
            </div>
          </>
        );
      
      case 12:
        // + VariantSelector
        // NOTE: Using overflow-clip on wrapper (like step 7-11) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
              <div className="absolute inset-0 p-2 w-full pointer-events-none">
                <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-pretty">{product.title}</p>
                    </div>
                    <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
                      <span>Price</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex absolute bottom-3 left-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <Suspense fallback={null}>
                    <VariantSelector product={product} />
                  </Suspense>
                </div>
                <div className="hidden md:flex absolute bottom-3 right-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <Suspense fallback={<div className="px-4 py-2 bg-gray-400 rounded-md">Loading...</div>}>
                    <AddToCart product={product} size="sm" />
                  </Suspense>
                </div>
              </div>
            </div>
          </>
        );
      
      case 13:
        // + production onTouchStart handler
        // NOTE: Using overflow-clip on wrapper (like step 7-12) to avoid scroll blocking
        return (
          <>
            <ScrollProbe />
            <div
              className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
              onTouchStart={() => {
                setIsTouched(true);
                const ev = new CustomEvent("productCard:activate", {
                  detail: { id: product.id },
                });
                window.dispatchEvent(ev);
              }}
              onMouseEnter={() => setIsTouched(true)}
              onMouseLeave={() => setIsTouched(false)}
            >
              <div className="relative size-full" style={{ overflow: 'clip' }}>
                <Link
                  href={productHref}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch={false}
                >
                  <Suspense fallback={<div className="size-full bg-gray-400" />}>
                    <ProductImage product={product} />
                  </Suspense>
                </Link>
              </div>
              <div className="absolute inset-0 p-2 w-full pointer-events-none">
                <div className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-8 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 items-end">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-pretty">{product.title}</p>
                    </div>
                    <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
                      <span>Price</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex absolute bottom-3 left-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <Suspense fallback={null}>
                    <VariantSelector product={product} />
                  </Suspense>
                </div>
                <div className="hidden md:flex absolute bottom-3 right-3 w-fit transition-all duration-300 pointer-events-auto opacity-0 group-hover:opacity-100 translate-y-1/3 group-hover:translate-y-0">
                  <Suspense fallback={<div className="px-4 py-2 bg-gray-400 rounded-md">Loading...</div>}>
                    <AddToCart product={product} size="sm" />
                  </Suspense>
                </div>
              </div>
            </div>
          </>
        );
      
      default:
        // Fallback to production
        break;
    }
  }

  const producerRegion = (() => {
    const producer = product.producerName?.trim() || null;
    const region =
      product.producerLocation?.subregion?.trim() ||
      product.producerLocation?.region?.trim() ||
      null;
    if (producer && region) return `${producer} · ${region}`;
    return producer || region;
  })();

  return (
    <>
      {DEBUG_SCROLL && <ScrollProbe />}
      <article
        className={cn(
          "relative w-full min-w-0 overflow-visible",
          showTopTabs && "mt-5",
        )}
      >
        {showTopTabs ? (
          <PeekTabAnchor className="left-2 md:left-3">
            {recommendationReason ? (
              <ProductCardRecommendationTab reason={recommendationReason} />
            ) : null}
            {showMembershipTab ? <ProductCardMembershipTab /> : null}
          </PeekTabAnchor>
        ) : null}

        <HoverPrefetchLink
          href={productHref}
          className="group flex w-full min-w-0 flex-col focus-visible:outline-none"
          style={{ touchAction: "pan-y", overscrollBehavior: "auto" }}
          aria-label={t("shop.viewProductAria", {
            title: product.title,
            price: `${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode}`,
          })}
          onClick={() => {
            const q = listSearchQuery?.trim();
            if (!q) return;
            void AnalyticsTracker.trackEvent({
              eventType: "search_result_clicked",
              eventCategory: "search",
              metadata: {
                productId: product.id,
                handle: product.handle,
                queryLength: q.length,
              },
            });
          }}
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
            {isWineBox &&
            discountInfo &&
            discountInfo.discountPercentage > 0 ? (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="rounded-full bg-green-100 text-green-800 border-green-200">
                  {t("shop.wineBoxOff", {
                    percent: Math.round(discountInfo.discountPercentage),
                  })}
                </Badge>
              </div>
            ) : null}
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
              <NewBadge show={product.b2bIsNew === true} />
              <StockBadge
                b2bStock={(product as { b2bStock?: number | null }).b2bStock}
                availableForSale={product.availableForSale}
                b2bAvailability={product.b2bAvailability}
              />
            </div>
            <ProductListImage
              product={product}
              priority={index < 3}
              index={index}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-0.5 px-2.5 pt-2 md:px-0">
            <p className="line-clamp-2 text-sm leading-snug text-foreground">
              {product.title}
            </p>
            {producerRegion ? (
              <p className="truncate text-xs text-muted-foreground">
                {producerRegion}
              </p>
            ) : null}
            <BoostBadgeSlot active={product.producerBoostActive === true} />
            <PriceViewTracker
              productId={product.id}
              productName={product.title}
              source="list"
              listPrice={
                listPriceSek ??
                (Number(product.priceRange.minVariantPrice.amount) || undefined)
              }
              currency={product.priceRange.minVariantPrice.currencyCode}
              className="text-sm font-medium"
            >
              <MemberPrice
                amount={product.priceRange.minVariantPrice.amount}
                currencyCode={product.priceRange.minVariantPrice.currencyCode}
                basePriceSek={listPriceSek ?? undefined}
                className="text-sm font-medium"
                showBadge={showMembershipBadge}
                priceExclVatOverride={
                  (product as { b2bPriceExclVat?: number }).b2bPriceExclVat ??
                  product.priceBreakdown?.b2bPriceExclVat
                }
              />
              {isWineBox &&
              discountInfo &&
              discountInfo.discountPercentage > 0 ? (
                <span className="ml-1 text-xs line-through opacity-40">
                  {formatPrice(
                    showExclVat
                      ? priceExclVat(discountInfo.totalWinePrice)
                      : Math.round(discountInfo.totalWinePrice).toString(),
                    product.priceRange.minVariantPrice.currencyCode,
                  )}
                </span>
              ) : null}
            </PriceViewTracker>
            <span className="mt-1.5 hidden h-11 w-full items-center justify-center rounded-md border border-foreground bg-transparent text-sm font-medium text-foreground transition-colors group-hover:bg-foreground group-hover:text-background md:inline-flex">
              {t("shop.viewWine")}
            </span>
          </div>
        </HoverPrefetchLink>
      </article>
    </>
  );
});
