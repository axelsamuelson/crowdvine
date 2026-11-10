"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { buildStickyAtcMetadata } from "@/lib/analytics/sticky-atc-metadata";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import {
  CART_DRAWER_OPEN_ATTR,
  isCookieBannerOpen,
  isDocumentFlagOpen,
  isOnScreenKeyboardOpen,
  MIX_BOX_OPEN_ATTR,
} from "@/lib/pdp/overlay-open";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/shopify/types";

type Props = {
  product: Product;
  /** Main PDP CTA (CaseModeSelector button). */
  mainCtaRef: RefObject<HTMLElement | null>;
  onBuy: () => void;
  disabled?: boolean;
  pending?: boolean;
  /** Mix-box sheet open (also mirrored to data-mix-box-open). */
  mixBoxOpen?: boolean;
};

const STICKY_SCROLL_PADDING = "calc(4.5rem + env(safe-area-inset-bottom, 0px))";

/**
 * Mobile-only sticky buy bar on PDP. Shows when the main CTA leaves the
 * viewport; hidden at footer, overlays, and when the keyboard is up.
 */
export function PdpStickyBuyBar({
  product,
  mainCtaRef,
  onBuy,
  disabled = false,
  pending = false,
  mixBoxOpen = false,
}: Props) {
  const { t } = useTranslations();
  const { formatSek } = useDisplayMoney();
  const [mainCtaHidden, setMainCtaHidden] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shownTrackedRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const bottlePriceSek = getProductListPriceSek(product);
  const priceLabel =
    bottlePriceSek != null ? formatSek(bottlePriceSek) : null;

  const recomputeOverlays = useCallback(() => {
    const cartOpen = isDocumentFlagOpen(CART_DRAWER_OPEN_ATTR);
    const mixOpen =
      mixBoxOpen || isDocumentFlagOpen(MIX_BOX_OPEN_ATTR);
    const cookieOpen = isCookieBannerOpen();
    setOverlayOpen(cartOpen || mixOpen || cookieOpen);
    setKeyboardOpen(isOnScreenKeyboardOpen());
  }, [mixBoxOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  // Reserve scroll padding so content isn't trapped under the sticky bar.
  useEffect(() => {
    if (!isMobile) return;
    const root = document.documentElement;
    const prev = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = STICKY_SCROLL_PADDING;
    return () => {
      root.style.scrollPaddingBottom = prev;
    };
  }, [isMobile]);

  useEffect(() => {
    recomputeOverlays();
    const onFlag = () => recomputeOverlays();
    window.addEventListener("cart-drawer-open-change", onFlag);
    window.addEventListener("mix-box-open-change", onFlag);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onFlag);
    vv?.addEventListener("scroll", onFlag);
    const mo = new MutationObserver(onFlag);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [CART_DRAWER_OPEN_ATTR, MIX_BOX_OPEN_ATTR],
      childList: true,
      subtree: true,
    });
    return () => {
      window.removeEventListener("cart-drawer-open-change", onFlag);
      window.removeEventListener("mix-box-open-change", onFlag);
      vv?.removeEventListener("resize", onFlag);
      vv?.removeEventListener("scroll", onFlag);
      mo.disconnect();
    };
  }, [recomputeOverlays]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    let obs: IntersectionObserver | null = null;
    let cancelled = false;
    let retryId = 0;

    const attach = (): boolean => {
      const cta =
        mainCtaRef.current ||
        document.querySelector<HTMLElement>("[data-pdp-main-cta]");
      if (!cta || cancelled) return false;

      obs = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          // Hidden when not intersecting (threshold 0 + bottom rootMargin).
          setMainCtaHidden(!(entry?.isIntersecting ?? true));
        },
        { threshold: 0, rootMargin: "0px 0px -8px 0px" },
      );
      obs.observe(cta);
      return true;
    };

    // Ref may not be populated on first paint (CaseModeSelector mounts after).
    if (!attach()) {
      retryId = window.setInterval(() => {
        if (attach()) window.clearInterval(retryId);
      }, 100);
    }

    return () => {
      cancelled = true;
      if (retryId) window.clearInterval(retryId);
      obs?.disconnect();
    };
  }, [mainCtaRef, product.id]);

  useEffect(() => {
    const footer =
      document.querySelector("footer") ||
      document.querySelector("[data-site-footer]");
    if (!footer) return;

    // Only treat as "at footer" when the footer has substantially entered the
    // viewport (not a few peeking pixels on short PDPs). Threshold: footer top
    // crosses the upper 40% of the viewport.
    const update = () => {
      const top = footer.getBoundingClientRect().top;
      setFooterVisible(top < window.innerHeight * 0.4);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const shouldShow =
    isMobile &&
    mainCtaHidden &&
    !footerVisible &&
    !overlayOpen &&
    !keyboardOpen &&
    !disabled;

  useEffect(() => {
    if (!shouldShow) {
      shownTrackedRef.current = false;
      return;
    }
    if (shownTrackedRef.current) return;
    shownTrackedRef.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "sticky_atc_shown",
      eventCategory: "cart",
      metadata: buildStickyAtcMetadata({
        wineId: product.id,
        mainCtaHidden: true,
        isMobileLayout: true,
      }),
    });
  }, [shouldShow, product.id]);

  const handleClick = () => {
    void AnalyticsTracker.trackEvent({
      eventType: "sticky_atc_clicked",
      eventCategory: "cart",
      metadata: buildStickyAtcMetadata({
        wineId: product.id,
        mainCtaHidden: true,
        isMobileLayout: true,
      }),
    });
    onBuy();
  };

  const reduced = reduceMotionRef.current;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden",
        "px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
      aria-hidden={!shouldShow}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-lg items-center gap-3",
          "min-h-14 max-h-[4.25rem] rounded-md border-t border-border bg-background",
          "px-3 py-2 shadow-[0_-1px_0_hsl(var(--border))]",
          "font-sans",
          reduced
            ? shouldShow
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
            : "transition-[transform,opacity] duration-[350ms] ease-out",
          !reduced &&
            (shouldShow
              ? "translate-y-0 opacity-100"
              : "translate-y-3 opacity-0 pointer-events-none"),
        )}
        data-testid="pdp-sticky-buy-bar"
        data-visible={shouldShow ? "true" : "false"}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {product.title}
          </p>
          {priceLabel ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {priceLabel}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || pending}
          className={cn(
            "shrink-0 rounded-md bg-[#0A0A0A] px-4 font-sans text-sm font-medium text-white",
            "h-11 min-h-11 max-h-12",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {t("shop.buy")}
        </button>
      </div>
    </div>
  );
}
