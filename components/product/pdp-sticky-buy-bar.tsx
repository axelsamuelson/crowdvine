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
  isMainCtaScrolledPast,
  isOnScreenKeyboardOpen,
  MIX_BOX_OPEN_ATTR,
  observeBodyChildList,
  splitTitleAndVintage,
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
 * Mobile-only sticky buy bar on PDP (PACT). Shows only after the main CTA has
 * scrolled *above* the viewport — never when it is still below the fold.
 * Hidden at footer, overlays, and when the keyboard is up.
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
  const [ctaScrolledPast, setCtaScrolledPast] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  /** Once per page view per wine_id — never reset on hide. */
  const shownTrackedForWineRef = useRef<string | null>(null);
  const reduceMotionRef = useRef(false);

  const bottlePriceSek = getProductListPriceSek(product);
  const priceLabel =
    bottlePriceSek != null ? formatSek(bottlePriceSek) : null;
  const { name: titleName, vintage: titleVintage } = splitTitleAndVintage(
    product.title,
  );

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

    // Attribute flags on <html> only — no subtree walk.
    const attrMo = new MutationObserver(onFlag);
    attrMo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [CART_DRAWER_OPEN_ATTR, MIX_BOX_OPEN_ATTR],
    });
    // Cookie banners typically mount as body children — childList only, debounced.
    const stopBody = observeBodyChildList(onFlag, 100);

    return () => {
      window.removeEventListener("cart-drawer-open-change", onFlag);
      window.removeEventListener("mix-box-open-change", onFlag);
      vv?.removeEventListener("resize", onFlag);
      vv?.removeEventListener("scroll", onFlag);
      attrMo.disconnect();
      stopBody();
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
          if (!entry) return;
          // Only "scrolled past" when the button is above the viewport —
          // not when it is still below the fold (not yet reached).
          setCtaScrolledPast(isMainCtaScrolledPast(entry));
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
    // Prefer the Navigation sentinel so the large footer logo can peek without
    // killing sticky — still hides before Navigation/Guider are covered.
    const target =
      document.querySelector("[data-sticky-hide-sentinel]") ||
      document.querySelector("footer") ||
      document.querySelector("[data-site-footer]");
    if (!target || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setFooterVisible(Boolean(entry?.isIntersecting));
      },
      { threshold: 0, rootMargin: "0px" },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  const shouldShow =
    isMobile &&
    ctaScrolledPast &&
    !footerVisible &&
    !overlayOpen &&
    !keyboardOpen &&
    !disabled;

  useEffect(() => {
    if (!shouldShow) return;
    // At most once per page view per wine_id (do not reset on hide/show).
    if (shownTrackedForWineRef.current === product.id) return;
    shownTrackedForWineRef.current = product.id;
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

  // Unmount while overlays are open so a translucent cart backdrop cannot
  // reveal the black Köp chrome peeking under the drawer.
  if (overlayOpen || !isMobile) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden",
        "px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        !shouldShow && "invisible",
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
          <p className="flex min-w-0 items-baseline gap-1 text-sm font-medium text-foreground">
            <span className="min-w-0 truncate">{titleName}</span>
            {titleVintage ? (
              <span className="shrink-0 tabular-nums">{titleVintage}</span>
            ) : null}
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
