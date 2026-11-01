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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberPrice } from "@/components/ui/member-price";
import { StockBadge } from "@/components/product/stock-badge";
import { NewBadge } from "@/components/product/new-badge";
import { BoostBadgeSlot } from "@/components/producer/boost-badge";
import { PeekTabAnchor } from "@/components/pdp/peek-tab-anchor";
import type { RecommendationReason } from "@/lib/product/recommendations";
import { useCartOptional } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { pricesFromCartAfterAdd } from "@/lib/analytics/cart-event-prices";
import { PriceViewTracker } from "@/components/analytics/price-view-tracker";
import { BOTTLE_PACK_SIZE } from "@/lib/cart/bottle-pack";
import { B2B_PRODUCER_ORDERS_ENABLED } from "@/lib/b2b/flags";
import type { Cart } from "@/lib/shopify/types";
import {
  isPlpTouchUi,
  isTapGesture,
  shouldInterceptPlpCardTap,
} from "@/lib/plp/commerce-box-touch";

const AddToCart = dynamic(
  () => import("@/components/cart/add-to-cart").then((m) => m.AddToCart),
  { loading: () => null },
);
const AddToCartButton = dynamic(
  () => import("@/components/cart/add-to-cart").then((m) => m.AddToCartButton),
  { loading: () => null },
);
const ShopWineCasePicker = dynamic(
  () =>
    import("@/components/cart/shop-wine-case-sheet").then(
      (m) => m.ShopWineCasePicker,
    ),
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
  const hasNoOptions = product.options.length === 0;
  const hasOneOptionWithOneValue =
    product.options.length === 1 && product.options[0].values.length === 1;
  const justHasColorOption =
    product.options.length === 1 &&
    product.options[0].name.toLowerCase() === "color";

  const renderInCardAddToCart =
    hasNoOptions || hasOneOptionWithOneValue || justHasColorOption;

  // Check if this is a wine box product
  const productType = (product as { productType?: string }).productType;
  const isWineBox = productType === "wine-box";
  const discountInfo = (product as any).discountInfo;

  const cart = useCartOptional();
  const isPdpRecommendation = recommendationReason != null;
  const showCartActions = !isPdpRecommendation && Boolean(cart);
  const showExclVat = useB2BPriceMode();
  const producerOrdersPaused = showExclVat && !B2B_PRODUCER_ORDERS_ENABLED;
  const [isTouched, setIsTouched] = useState(false);
  const touchSeenRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchedRef = useRef(false);
  /** After a touch reveal, swallow the synthetic click so Next.js Link does not navigate. */
  const suppressClickRef = useRef(false);

  const shopCaseWineCta =
    !showExclVat &&
    !isWineBox &&
    productType === "wine" &&
    Boolean(product.producerId);

  // White commerce box is hidden by default. Desktop (hover:hover): group-hover /
  // focus-within. Touch / coarse pointer: first tap sets isTouched (never always-on).
  const showMembershipBadge = !showMembershipTab;
  const listPriceSek = getProductListPriceSek(product);
  const showTopTabs = showMembershipTab || recommendationReason != null;

  useEffect(() => {
    isTouchedRef.current = isTouched;
  }, [isTouched]);

  const revealCommerceBox = () => {
    if (isTouchedRef.current) return;
    isTouchedRef.current = true;
    setIsTouched(true);
    window.dispatchEvent(
      new CustomEvent("productCard:activate", {
        detail: { id: product.id },
      }),
    );
  };

  // Keep overlay visible until another product card is activated
  useEffect(() => {
    const onActivate = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail) return;
      if (detail.id !== product.id) {
        isTouchedRef.current = false;
        setIsTouched(false);
      }
    };
    window.addEventListener("productCard:activate", onActivate as EventListener);
    return () => {
      window.removeEventListener(
        "productCard:activate",
        onActivate as EventListener,
      );
    };
  }, [product.id]);

  // Get base variant for products without options or first variant for products with variants
  const getBaseProductVariant = (): any => {
    if (product.variants.length === 0) {
      return {
        id: product.id,
        title: product.title,
        availableForSale: product.availableForSale,
        selectedOptions: [],
        price: product.priceRange.minVariantPrice,
      };
    }
    if (product.variants.length === 1) {
      return product.variants[0];
    }
    // Return first variant for products with multiple variants (for mobile add to cart)
    if (product.variants.length > 1) {
      return product.variants[0];
    }
    return null;
  };

  const handleAddToCart = () => {
    if (!cart) return;
    const variant = getBaseProductVariant();
    if (variant) {
      void (async () => {
        let updated: Cart | null = null;

        if (showExclVat) {
          // Dirty Wine: always add a 6-bottle pack
          const response = await fetch("/api/cart/add-quantity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variantId: variant.id,
              quantity: BOTTLE_PACK_SIZE,
              source: "producer",
              enforcePack: true,
            }),
          });
          if (response.ok) {
            const result = await response.json();
            updated = (result.cart as Cart | undefined) ?? null;
            if (updated && typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("cart-refresh", { detail: updated }),
              );
            }
          }
        } else {
          updated = await cart.addItem(variant, product);
        }

        const { list_price, unit_price } = pricesFromCartAfterAdd(
          updated,
          product.id,
          product,
        );
        void AnalyticsTracker.trackAddToCart(
          product.id,
          product.title,
          list_price,
          {
            quantity: showExclVat ? BOTTLE_PACK_SIZE : 1,
            source: showExclVat ? "b2b" : "list",
            list_price,
            unit_price,
            price_version: "v1",
          },
        );
      })();
    }
  };

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

  return (
    <>
      {DEBUG_SCROLL && <ScrollProbe />}
      <div
        className={cn(
          "relative w-full overflow-visible",
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
      <div
        className={cn(
          "relative z-10 w-full aspect-[3/4] md:aspect-square bg-muted group",
          isTouched && "is-touch-revealed",
        )}
        style={{ clipPath: 'inset(0)' }}
        data-plp-card={product.id}
        onTouchStart={(e) => {
          touchSeenRef.current = true;
          const t = e.touches[0];
          touchStartRef.current = t
            ? { x: t.clientX, y: t.clientY }
            : null;
        }}
        onTouchEnd={(e) => {
          if (typeof window === "undefined") return;
          const touchUi = isPlpTouchUi(undefined, touchSeenRef.current);
          if (
            !shouldInterceptPlpCardTap({
              isTouchUi: touchUi,
              isRevealed: isTouchedRef.current,
            })
          ) {
            // Already revealed: keep this card active so siblings can dismiss.
            if (isTouchedRef.current) {
              window.dispatchEvent(
                new CustomEvent("productCard:activate", {
                  detail: { id: product.id },
                }),
              );
            }
            return;
          }
          const t = e.changedTouches[0];
          if (
            t &&
            !isTapGesture(touchStartRef.current, {
              x: t.clientX,
              y: t.clientY,
            })
          ) {
            return;
          }
          // Reveal immediately on touchend so the box paints before the
          // synthetic click; suppress that click so the product link does not navigate.
          suppressClickRef.current = true;
          revealCommerceBox();
        }}
        onClickCapture={(e) => {
          if (typeof window === "undefined") return;
          const touchUi = isPlpTouchUi(undefined, touchSeenRef.current);
          const intercept = shouldInterceptPlpCardTap({
            isTouchUi: touchUi,
            isRevealed: isTouchedRef.current,
          });
          if (!intercept && !suppressClickRef.current) return;
          // First tap (or the click that follows a touchend reveal): do not navigate.
          // preventDefault so Next.js <Link> (checks defaultPrevented) skips router.push.
          e.preventDefault();
          e.stopPropagation();
          suppressClickRef.current = false;
          if (intercept) revealCommerceBox();
        }}
      >
      {/* Content wrapper - overflow-clip so wheel scroll propagates to document */}
      <div className="relative size-full overflow-clip">
        {/* Discount Badge for Wine Boxes */}
        {isWineBox &&
          discountInfo &&
          discountInfo.discountPercentage > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {t("shop.wineBoxOff", {
                percent: Math.round(discountInfo.discountPercentage),
              })}
            </Badge>
          </div>
        )}

        <HoverPrefetchLink
          href={productHref}
          className="block size-full focus-visible:outline-none"
          style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
          aria-label={t("shop.viewProductAria", {
            title: product.title,
            price: `${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode}`,
          })}
          onClick={(e) => {
            const touchUi = isPlpTouchUi(undefined, touchSeenRef.current);
            const intercept = shouldInterceptPlpCardTap({
              isTouchUi: touchUi,
              isRevealed: isTouchedRef.current,
            });
            if (intercept || suppressClickRef.current) {
              // Belt-and-braces: Next.js Link skips navigation when defaultPrevented.
              e.preventDefault();
              e.stopPropagation();
              suppressClickRef.current = false;
              if (intercept) revealCommerceBox();
              return;
            }
            // Allow Next.js <Link> to navigate (PDP). Optional search analytics only.
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
            <ProductListImage product={product} priority={index < 3} index={index} />
        </HoverPrefetchLink>
      </div>

      {/* Interactive Overlay - moved outside wrapper to avoid overflow-clip issues */}
      <div className="absolute inset-0 pl-1 pr-2 pt-2 pb-2 md:p-2 w-full pointer-events-none">
        {/* Top meta: visible by default; hide on desktop when commerce box is revealed */}
        <div className="plp-card-top-meta flex gap-2 md:gap-6 justify-between items-start md:items-baseline px-1 md:px-3 py-1 w-full font-semibold transition-all duration-300 translate-y-0">
          <div className="flex flex-col min-w-0 max-w-[42%] md:max-w-[40%] shrink md:shrink-0 rounded-r pr-1.5 md:pr-0 md:rounded-none py-1 md:py-0 -my-1 md:my-0 overflow-hidden">
            <p className="text-[8px] leading-tight md:text-sm uppercase 2xl:text-base text-balance line-clamp-2 md:line-clamp-2 break-words overflow-hidden">
              {product.title}
            </p>
            {product.producerName && (
              <p className="text-[7px] md:text-xs text-muted-foreground font-normal line-clamp-1 md:line-clamp-1 mt-0.5 leading-tight">
                {product.producerName}
              </p>
            )}
            <BoostBadgeSlot active={product.producerBoostActive === true} />
            <div className="mt-0.5 flex min-h-[14px] flex-wrap items-center gap-0.5 md:min-h-[18px] md:gap-1">
              <NewBadge show={product.b2bIsNew === true} />
              <StockBadge
                b2bStock={(product as any).b2bStock}
                availableForSale={product.availableForSale}
                b2bAvailability={product.b2bAvailability}
              />
            </div>
          </div>
          <PriceViewTracker
            productId={product.id}
            productName={product.title}
            source="list"
            listPrice={
              listPriceSek ??
              (Number(product.priceRange.minVariantPrice.amount) || undefined)
            }
            currency={product.priceRange.minVariantPrice.currencyCode}
            className="flex gap-1 md:gap-2 items-center justify-end min-w-0 shrink md:max-w-[35%] md:shrink-0 text-[9px] md:text-sm uppercase 2xl:text-base text-right overflow-hidden"
          >
            <MemberPrice
              amount={product.priceRange.minVariantPrice.amount}
              currencyCode={product.priceRange.minVariantPrice.currencyCode}
              basePriceSek={listPriceSek ?? undefined}
              className="text-[9px] md:text-sm uppercase 2xl:text-base"
              showBadge={showMembershipBadge}
              compactOnMobile={true}
              priceExclVatOverride={
                (product as any).b2bPriceExclVat ??
                product.priceBreakdown?.b2bPriceExclVat
              }
            />
            {isWineBox &&
              discountInfo &&
              discountInfo.discountPercentage > 0 && (
              <span className="line-through opacity-30 text-[8px] md:text-xs">
                {formatPrice(
                  showExclVat
                    ? priceExclVat(discountInfo.totalWinePrice)
                    : Math.round(discountInfo.totalWinePrice).toString(),
                  product.priceRange.minVariantPrice.currencyCode,
                )}
              </span>
            )}
          </PriceViewTracker>
        </div>

        {/* PLP commerce box — creative-director spec; never always-visible */}
        {showCartActions ? (
          <div className="plp-commerce-box plp-commerce-box--touch absolute bottom-2 left-2 right-2 z-10 flex flex-col gap-1.5 rounded-lg bg-white/95 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {shopCaseWineCta ? (
              <>
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <Link
                    href={productHref}
                    className="min-w-0 truncate text-[13px] font-medium leading-none text-foreground pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.title}
                  </Link>
                  <MemberPrice
                    amount={product.priceRange.minVariantPrice.amount}
                    currencyCode={product.priceRange.minVariantPrice.currencyCode}
                    basePriceSek={listPriceSek ?? undefined}
                    className="shrink-0 text-[13px] font-semibold leading-none"
                    showBadge={false}
                    priceExclVatOverride={
                      (product as any).b2bPriceExclVat ??
                      product.priceBreakdown?.b2bPriceExclVat
                    }
                  />
                </div>
                {product.producerName ? (
                  <p className="truncate text-[12px] leading-none text-muted-foreground">
                    {product.producerName}
                  </p>
                ) : null}
                <div className="pointer-events-auto pt-0.5">
                  <Suspense
                    fallback={
                      <Button
                        type="button"
                        disabled
                        className="h-10 w-full rounded-[6px] bg-black text-white border-black"
                        size="sm"
                      >
                        <span className="text-[13px]">{t("shop.reserve")}</span>
                      </Button>
                    }
                  >
                    <ShopWineCasePicker
                      product={product}
                      size="sm"
                      className="h-10 w-full rounded-[6px]"
                      triggerLabel={t("shop.reserve")}
                      analyticsSource="list"
                    />
                  </Suspense>
                </div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <Link
                    href={productHref}
                    className="min-w-0 truncate text-[13px] font-medium leading-none text-foreground pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.title}
                  </Link>
                  <MemberPrice
                    amount={product.priceRange.minVariantPrice.amount}
                    currencyCode={product.priceRange.minVariantPrice.currencyCode}
                    basePriceSek={listPriceSek ?? undefined}
                    className="shrink-0 text-[13px] font-semibold leading-none"
                    showBadge={false}
                    priceExclVatOverride={
                      (product as any).b2bPriceExclVat ??
                      product.priceBreakdown?.b2bPriceExclVat
                    }
                  />
                </div>
                {product.producerName ? (
                  <p className="truncate text-[12px] leading-none text-muted-foreground">
                    {product.producerName}
                  </p>
                ) : null}
                {producerOrdersPaused ? null : (
                  <div className="pointer-events-auto pt-0.5">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart();
                      }}
                      disabled={!getBaseProductVariant()}
                      className="h-10 w-full rounded-[6px] bg-black hover:bg-black/90 text-white border-black"
                      size="sm"
                    >
                      <span className="text-[13px]">{t("product.addToCart")}</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* Desktop hover / focus-within — same creative-director layout */}
        <div className="plp-commerce-box plp-commerce-box--hover absolute bottom-2 left-2 right-2 hidden w-auto flex-col gap-1.5 rounded-lg bg-white/95 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:flex">
          {shopCaseWineCta ? (
            <>
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <Link
                  href={productHref}
                  className="min-w-0 truncate text-[14px] font-medium leading-none text-foreground pointer-events-auto"
                >
                  {product.title}
                </Link>
                <MemberPrice
                  amount={product.priceRange.minVariantPrice.amount}
                  currencyCode={product.priceRange.minVariantPrice.currencyCode}
                  basePriceSek={listPriceSek ?? undefined}
                  className="shrink-0 text-[14px] font-semibold leading-none"
                  showBadge={false}
                  priceExclVatOverride={
                    (product as any).b2bPriceExclVat ??
                    product.priceBreakdown?.b2bPriceExclVat
                  }
                />
              </div>
              {product.producerName ? (
                <p className="truncate text-[12px] leading-none text-muted-foreground">
                  {product.producerName}
                </p>
              ) : null}
              {showCartActions ? (
                <div className="pointer-events-auto pt-0.5">
                  <Suspense
                    fallback={
                      <Button
                        type="button"
                        disabled
                        className="h-10 w-full rounded-[6px] bg-black text-white border-black"
                        size="sm"
                      >
                        <span className="text-[13px]">{t("shop.reserve")}</span>
                      </Button>
                    }
                  >
                    {producerOrdersPaused ? null : (
                      <ShopWineCasePicker
                        product={product}
                        size="sm"
                        className="h-10 w-full rounded-[6px]"
                        triggerLabel={t("shop.reserve")}
                        analyticsSource="list"
                      />
                    )}
                  </Suspense>
                </div>
              ) : null}
            </>
          ) : showCartActions ? (
            <>
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <Link
                  href={productHref}
                  className="min-w-0 truncate text-[14px] font-medium leading-none text-foreground pointer-events-auto"
                >
                  {product.title}
                </Link>
                <MemberPrice
                  amount={product.priceRange.minVariantPrice.amount}
                  currencyCode={product.priceRange.minVariantPrice.currencyCode}
                  basePriceSek={listPriceSek ?? undefined}
                  className="shrink-0 text-[14px] font-semibold leading-none"
                  showBadge={false}
                  priceExclVatOverride={
                    (product as any).b2bPriceExclVat ??
                    product.priceBreakdown?.b2bPriceExclVat
                  }
                />
              </div>
              {product.producerName ? (
                <p className="truncate text-[12px] leading-none text-muted-foreground">
                  {product.producerName}
                </p>
              ) : null}
              <div className="pointer-events-auto pt-0.5">
                <Suspense
                  fallback={
                    <AddToCartButton
                      product={product}
                      size="sm"
                      className="h-10 w-full rounded-[6px]"
                    />
                  }
                >
                  {producerOrdersPaused ? null : (
                    <AddToCart
                      size="sm"
                      product={product}
                      className="h-10 w-full rounded-[6px]"
                    />
                  )}
                </Suspense>
              </div>
            </>
          ) : null}
        </div>
      </div>
      </div>
      </div>
    </>
  );
});
