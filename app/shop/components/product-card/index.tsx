"use client";

import React, { Suspense, memo, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Product } from "@/lib/shopify/types";
import { AddToCart, AddToCartButton } from "@/components/cart/add-to-cart";
import { formatPrice, priceExclVat } from "@/lib/shopify/utils";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { VariantSelector } from "../variant-selector";
import { ProductImage } from "./product-image";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CirclePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemberPrice } from "@/components/ui/member-price";
import { StockBadge } from "@/components/product/stock-badge";
import { useCart } from "@/components/cart/cart-context";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { ColorSwatch } from "@/components/ui/color-picker";
import { getColorHex } from "@/lib/utils";

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


export const ProductCard = memo(({ product, index = 0 }: { product: Product; index?: number }) => {
  const hasNoOptions = product.options.length === 0;
  const hasOneOptionWithOneValue =
    product.options.length === 1 && product.options[0].values.length === 1;
  const justHasColorOption =
    product.options.length === 1 &&
    product.options[0].name.toLowerCase() === "color";

  const renderInCardAddToCart =
    hasNoOptions || hasOneOptionWithOneValue || justHasColorOption;

  // Check if this is a wine box product
  const isWineBox = (product as any).productType === "wine-box";
  const discountInfo = (product as any).discountInfo;

  const { addItem } = useCart();
  const showExclVat = useB2BPriceMode();
  const [isTouched, setIsTouched] = useState(false);

  // Keep overlay visible until another product card is activated
  useEffect(() => {
    const onActivate = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail) return;
      if (detail.id !== product.id) {
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

  // Get wine color object from options or tags; handle both string and object values
  const getWineColor = (): { name: string; value: string | [string, string] } | null => {
    let colorName: string | null = null;
    
    const colorOption = product.options.find(
      (opt) => opt.name?.toLowerCase() === "color"
    );
    if (colorOption && Array.isArray(colorOption.values) && colorOption.values.length > 0) {
      const firstValue: unknown = colorOption.values[0] as unknown;
      if (typeof firstValue === "string") {
        colorName = firstValue;
      } else if (
        firstValue &&
        typeof firstValue === "object" &&
        typeof (firstValue as any).name === "string"
      ) {
        colorName = (firstValue as any).name as string;
      }
    }
    
    // Fallback to tags (common color tags)
    if (!colorName) {
      const colorTags = ["Red", "White", "Rosé", "Orange", "Rött", "Vitt", "Rosévin"];
      colorName = product.tags?.find((tag) =>
        colorTags.some((colorTag) => tag.toLowerCase().includes(colorTag.toLowerCase()))
      ) || null;
    }
    
    if (!colorName) return null;
    
    // Get hex color value
    const colorHex = getColorHex(colorName);
    
    // Return color object in ColorSwatch format
    if (Array.isArray(colorHex)) {
      return {
        name: colorName,
        value: [colorHex[0], colorHex[1]] as [string, string],
      };
    }
    
    return {
      name: colorName,
      value: colorHex,
    };
  };

  const wineColor = getWineColor();

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
    const variant = getBaseProductVariant();
    if (variant) {
      addItem(variant, product);
      // Track add to cart event
      AnalyticsTracker.trackAddToCart(
        product.id,
        product.title,
        parseFloat(product.priceRange.minVariantPrice.amount)
      );
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
                href={`/product/${product.handle}`}
                className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
                  href={`/product/${product.handle}`}
                  className="block size-full focus-visible:outline-none"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
                  prefetch
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
        className="relative w-full aspect-[3/4] md:aspect-square bg-muted group"
        style={{ clipPath: 'inset(0)' }}
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
      {/* Content wrapper - overflow-clip so wheel scroll propagates to document */}
      <div className="relative size-full overflow-clip">
        {/* Discount Badge for Wine Boxes */}
        {isWineBox && discountInfo && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-green-100 text-green-800 border-green-200">
              {Math.round(discountInfo.discountPercentage)}% OFF
            </Badge>
          </div>
        )}

        <Link
          href={`/product/${product.handle}`}
          className="block size-full focus-visible:outline-none"
          style={{ touchAction: 'pan-y', overscrollBehavior: 'auto' }}
          aria-label={`View details for ${product.title}, price ${product.priceRange.minVariantPrice}`}
          prefetch
        >
          <Suspense fallback={null}>
            <ProductImage product={product} priority={index < 3} index={index} />
          </Suspense>
        </Link>
      </div>

      {/* Interactive Overlay - moved outside wrapper to avoid overflow-clip issues */}
      <div className="absolute inset-0 pl-1 pr-2 pt-2 pb-2 md:p-2 w-full pointer-events-none">
        {/* Mobile & Desktop Default: Info overlay (always visible on mobile, visible on desktop until hover) */}
        <div className="flex gap-2 md:gap-6 justify-between items-start md:items-baseline px-1 md:px-3 py-1 w-full font-semibold transition-all duration-300 translate-y-0 md:group-hover:opacity-0 md:group-focus-visible:opacity-0 md:group-hover:-translate-y-full md:group-focus-visible:-translate-y-full">
          <div className="flex flex-col min-w-0 max-w-[42%] md:max-w-[40%] shrink md:shrink-0 rounded-r pr-1.5 md:pr-0 md:rounded-none py-1 md:py-0 -my-1 md:my-0 overflow-hidden">
            <p className="text-[8px] leading-tight md:text-sm uppercase 2xl:text-base text-balance line-clamp-2 md:line-clamp-2 break-words overflow-hidden">
              {product.title}
            </p>
            {product.producerName && (
              <p className="text-[7px] md:text-xs text-muted-foreground font-normal line-clamp-1 md:line-clamp-1 mt-0.5 leading-tight">
                {product.producerName}
              </p>
            )}
            <StockBadge
              b2bStock={(product as any).b2bStock}
              availableForSale={product.availableForSale}
              className="mt-0.5"
            />
          </div>
          <div className="flex gap-1 md:gap-2 items-center justify-end min-w-0 shrink md:max-w-[35%] md:shrink-0 text-[9px] md:text-sm uppercase 2xl:text-base text-right overflow-hidden">
            <MemberPrice
              amount={product.priceRange.minVariantPrice.amount}
              currencyCode={product.priceRange.minVariantPrice.currencyCode}
              className="text-[9px] md:text-sm uppercase 2xl:text-base"
              showBadge={true}
              compactOnMobile={true}
              priceExclVatOverride={
                (product as any).b2bPriceExclVat ??
                product.priceBreakdown?.b2bPriceExclVat
              }
            />
            {isWineBox && discountInfo && (
              <span className="line-through opacity-30 text-[8px] md:text-xs">
                {formatPrice(
                  showExclVat
                    ? priceExclVat(discountInfo.totalWinePrice)
                    : Math.round(discountInfo.totalWinePrice).toString(),
                  product.priceRange.minVariantPrice.currencyCode,
                )}
              </span>
            )}
          </div>
        </div>

        {/* Mobile: Premium bottom overlay with Add to Cart button (visible on touch/hover) */}
        {renderInCardAddToCart && (
          <div
            className={`md:hidden absolute inset-x-2 bottom-2 px-2.5 py-2 rounded-md bg-white/95 backdrop-blur-sm pointer-events-auto shadow-lg transition-opacity duration-200 ${
              isTouched ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-center min-w-0">
                {wineColor ? (
                  <div className="flex shrink-0 items-center">
                    <ColorSwatch
                      color={
                        Array.isArray(wineColor.value)
                          ? [
                              { name: wineColor.name, value: wineColor.value[0] },
                              { name: wineColor.name, value: wineColor.value[1] },
                            ]
                          : { name: wineColor.name, value: wineColor.value as string }
                      }
                      isSelected={false}
                      onColorChange={() => {}}
                      size="xs"
                      atLeastOneColorSelected={false}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 flex justify-center">
                  <MemberPrice
                    amount={product.priceRange.minVariantPrice.amount}
                    currencyCode={product.priceRange.minVariantPrice.currencyCode}
                    className="text-xs font-semibold sm:text-sm"
                    showBadge={true}
                    badgeRightOnMobile={true}
                    priceExclVatOverride={
                      (product as any).b2bPriceExclVat ??
                      product.priceBreakdown?.b2bPriceExclVat
                    }
                  />
                </div>
              </div>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart();
                }}
                disabled={!getBaseProductVariant()}
                className="w-full bg-black hover:bg-black/90 text-white border-black rounded-md"
                size="sm"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs">Add to cart</span>
                  <CirclePlus className="size-3.5" />
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile: Add to Cart button for products with variants (visible on touch/hover) */}
        {!renderInCardAddToCart && (
          <div
            className={`md:hidden absolute inset-x-2 bottom-2 px-2.5 py-2 rounded-md bg-white/95 backdrop-blur-sm pointer-events-auto shadow-lg transition-opacity duration-200 ${
              isTouched ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-center min-w-0">
                {wineColor ? (
                  <div className="flex shrink-0 items-center">
                    <ColorSwatch
                      color={
                        Array.isArray(wineColor.value)
                          ? [
                              { name: wineColor.name, value: wineColor.value[0] },
                              { name: wineColor.name, value: wineColor.value[1] },
                            ]
                          : { name: wineColor.name, value: wineColor.value as string }
                      }
                      isSelected={false}
                      onColorChange={() => {}}
                      size="xs"
                      atLeastOneColorSelected={false}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 flex justify-center">
                  <MemberPrice
                    amount={product.priceRange.minVariantPrice.amount}
                    currencyCode={product.priceRange.minVariantPrice.currencyCode}
                    className="text-xs font-semibold sm:text-sm"
                    showBadge={true}
                    badgeRightOnMobile={true}
                    priceExclVatOverride={
                      (product as any).b2bPriceExclVat ??
                      product.priceBreakdown?.b2bPriceExclVat
                    }
                  />
                </div>
              </div>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddToCart();
                }}
                disabled={!getBaseProductVariant()}
                className="w-full bg-black hover:bg-black/90 text-white border-black rounded-md"
                size="sm"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs">Add to cart</span>
                  <CirclePlus className="size-3.5" />
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Desktop: Move Add to Cart into the white info box instead of top-right */}

        {/* Desktop Hover: White card with full details (only on desktop) */}
        {/* Visual panel with buttons inside - pointer-events-none on container, pointer-events-auto on buttons */}
        <div 
          className="hidden md:flex absolute inset-x-3 bottom-3 flex-col gap-4 px-2 py-3 rounded-md transition-all duration-300 pointer-events-none bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-1/3 group-hover:translate-y-0 group-focus-visible:translate-y-0"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 items-end">
            <div className="flex flex-col">
              <p className="text-lg font-semibold text-pretty">
                {product.title}
              </p>
              {product.producerName && (
                <p className="text-sm text-muted-foreground font-normal">
                  {product.producerName}
                </p>
              )}
              {wineColor && (
                <div className="mt-1">
                  <ColorSwatch
                    color={
                      Array.isArray(wineColor.value)
                        ? [
                            { name: wineColor.name, value: wineColor.value[0] },
                            { name: wineColor.name, value: wineColor.value[1] },
                          ]
                        : { name: wineColor.name, value: wineColor.value as string }
                    }
                    isSelected={false}
                    onColorChange={() => {}}
                    size="sm"
                    atLeastOneColorSelected={false}
                  />
                </div>
              )}
              <StockBadge
                b2bStock={(product as any).b2bStock}
                availableForSale={product.availableForSale}
                className="mt-0.5"
              />
            </div>
            <div className="flex gap-2 items-center place-self-end text-lg font-semibold">
              <MemberPrice
                amount={product.priceRange.minVariantPrice.amount}
                currencyCode={product.priceRange.minVariantPrice.currencyCode}
                className="text-lg font-semibold"
                showBadge={true}
                priceExclVatOverride={
                  (product as any).b2bPriceExclVat ??
                  product.priceBreakdown?.b2bPriceExclVat
                }
              />
              {isWineBox && discountInfo && (
                <span className="text-base line-through opacity-30">
                  {formatPrice(
                    showExclVat
                      ? priceExclVat(discountInfo.totalWinePrice)
                      : Math.round(discountInfo.totalWinePrice).toString(),
                    product.priceRange.minVariantPrice.currencyCode,
                  )}
                </span>
              )}
            </div>
          </div>
          
          {/* Buttons inside white box - equal width for symmetry */}
          <div className="grid grid-cols-2 gap-3 items-center mt-2 pointer-events-auto">
            {renderInCardAddToCart ? (
              <>
                <div className="min-w-0">
                  <Suspense fallback={null}>
                    <VariantSelector product={product} />
                  </Suspense>
                </div>
                <div className="min-w-0">
                  <Suspense
                    fallback={
                      <AddToCartButton
                        product={product}
                        size="sm"
                        className="w-full"
                      />
                    }
                  >
                    <AddToCart
                      size="sm"
                      product={product}
                      className="w-full"
                    />
                  </Suspense>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <Suspense
                    fallback={
                      <AddToCartButton
                        product={product}
                        size="sm"
                        className="bg-black hover:bg-black/90 text-white border-black rounded-md w-full"
                      />
                    }
                  >
                    <AddToCart
                      product={product}
                      size="sm"
                      className="bg-black hover:bg-black/90 text-white border-black rounded-md w-full"
                    />
                  </Suspense>
                </div>
                <div className="min-w-0">
                  <Button
                    className="bg-black hover:bg-black/90 text-white border-black rounded-md w-full flex justify-between items-center"
                    size="sm"
                    asChild
                  >
                    <Link href={`/product/${product.handle}`}>
                      <span>View Product</span>
                      <ArrowRightIcon className="shrink-0" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
});
