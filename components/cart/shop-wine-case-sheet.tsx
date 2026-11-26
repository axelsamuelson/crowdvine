"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Product, ProductVariant } from "@/lib/shopify/types";
import { useSelectedVariant } from "@/components/products/variant-selector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CaseModeSelector, type CaseMode } from "./case-mode-selector";
import { CasePurchaseHelpTrigger } from "./case-purchase-help-trigger";
import { AddToCartCase } from "./AddToCartCase";
import { useCartOptional } from "./cart-context";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { beginOptimisticCaseAdd } from "@/lib/cart/optimistic-case-cart";
import {
  ADD_TO_CART_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
} from "@/lib/cart/cart-merge-client";
import { pricesFromCartAfterAdd } from "@/lib/analytics/cart-event-prices";
import { useTranslations } from "@/lib/hooks/use-translations";
import { producerDisplayName } from "@/lib/producer-display-name";

function dispatchCartRefresh(cart: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cart-refresh", { detail: cart }));
}

const getBaseProductVariant = (product: Product): ProductVariant => ({
  id: product.id,
  title: product.title,
  availableForSale: product.availableForSale,
  selectedOptions: [],
  price: product.priceRange.minVariantPrice,
});

function useResolvedCaseVariant(product: Product): ProductVariant | undefined {
  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();
  const { variants } = product;
  const hasNoVariants = variants.length === 0;
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = selectedVariant?.id || defaultVariantId;
  const isTargetingProduct =
    pathname.handle === product.id || searchParams.get("pid") === product.id;

  return useMemo(() => {
    if (hasNoVariants) return getBaseProductVariant(product);
    if (!isTargetingProduct && !defaultVariantId) {
      return selectedVariant ?? variants[0] ?? undefined;
    }
    return variants.find((variant) => variant.id === selectedVariantId);
  }, [
    hasNoVariants,
    product,
    isTargetingProduct,
    defaultVariantId,
    variants,
    selectedVariantId,
    selectedVariant,
  ]);
}

export interface ShopWineCaseSheetProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Analytics surface for add_to_cart.source */
  analyticsSource?: "list" | "product" | "guide";
}

/**
 * Mini sheet (mobile bottom / desktop centered) with same case UI as PDP.
 */
export function ShopWineCaseSheet({
  product,
  open,
  onOpenChange,
  analyticsSource = "list",
}: ShopWineCaseSheetProps) {
  const { t } = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<CaseMode>("same");
  const [mixedHandoff, setMixedHandoff] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const cartApi = useCartOptional();
  const resolvedVariant = useResolvedCaseVariant(product);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (open) setMode("same");
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (!resolvedVariant) return;
    if (mode === "mixed") {
      onOpenChange(false);
      setMixedHandoff(true);
      return;
    }
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    onOpenChange(false);
    const pending = beginOptimisticCaseAdd({
      previous: cartApi?.cart,
      product,
      variant: resolvedVariant,
      quantity: 6,
      timeoutMessage: t("cart.addTimeout"),
      onCart: dispatchCartRefresh,
      fetchAdd: () =>
        fetchWithTimeout(
          "/api/cart/add-quantity",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variantId: resolvedVariant.id,
              quantity: 6,
              source: "producer",
            }),
          },
          ADD_TO_CART_FETCH_TIMEOUT_MS,
        ),
    });
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    console.info("[list-buy] cart open requested", {
      msFromClick: Math.round(now - started),
    });
    void pending.then((result) => {
      const settled =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      console.info("[list-buy] add-quantity settled", {
        msFromClick: Math.round(settled - started),
        ok: result.ok,
        timedOut: result.timedOut === true,
      });
      if (result.ok) {
        const { list_price, unit_price } = pricesFromCartAfterAdd(
          result.cart,
          product.id,
          product,
        );
        void AnalyticsTracker.trackAddToCart(
          product.id,
          product.title,
          list_price,
          {
            quantity: 6,
            source: analyticsSource,
            list_price,
            unit_price,
            price_version: "v1",
          },
        );
        return;
      }
      void AnalyticsTracker.trackAddToCartFailed({
        reason: result.timedOut ? "network_error" : "http_error",
        productId: product.id,
        source: analyticsSource,
        ...(result.httpStatus != null ? { http_status: result.httpStatus } : {}),
      });
    });
  }, [analyticsSource, cartApi?.cart, mode, onOpenChange, product, resolvedVariant, t]);

  if (!mounted || typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              key="shop-wine-case-overlay"
              className="fixed inset-0 z-[115]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button
                type="button"
                aria-label={t("cart.closeDialog")}
                className="absolute inset-0 bg-black/60"
                onClick={() => onOpenChange(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`shop-case-title-${product.id}`}
                initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
                animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: "100%" }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className={cn(
                  "absolute bg-background shadow-xl",
                  isDesktop
                    ? "left-1/2 top-1/2 w-[min(100vw-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border p-4"
                    : "inset-x-0 bottom-0 max-h-[min(90dvh,640px)] rounded-t-2xl border-x border-t border-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1",
                )}
              >
                {!isDesktop ? (
                  <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/35" />
                ) : null}
                <div className="mb-3 flex gap-3 border-b border-border pb-3">
                  <div className="min-w-0 flex-1">
                    <p
                      id={`shop-case-title-${product.id}`}
                      className="text-sm font-semibold leading-snug text-foreground"
                    >
                      {product.title}
                    </p>
                    {producerDisplayName({
                      name: product.producerName,
                      display_name: product.producerDisplayName,
                    }) ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {producerDisplayName({
                          name: product.producerName,
                          display_name: product.producerDisplayName,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <CasePurchaseHelpTrigger className="self-start" />
                </div>
                <CaseModeSelector
                  mode={mode}
                  onModeChange={setMode}
                  onConfirm={handleConfirm}
                  disabled={!resolvedVariant}
                  pending={false}
                  label={
                    !resolvedVariant
                      ? t("product.selectOne")
                      : t("shop.addCase")
                  }
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
      {mixedHandoff ? (
        <AddToCartCase
          product={product}
          sheetOnly
          initialMixedSheetOpen
          analyticsSource={analyticsSource}
          onMixedSheetOpenChange={(o) => {
            if (!o) setMixedHandoff(false);
          }}
        />
      ) : null}
    </>
  );
}

export interface ShopWineCasePickerProps {
  product: Product;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Button label before opening the sheet */
  triggerLabel?: string;
  analyticsSource?: "list" | "product" | "guide";
}

/**
 * Shop card entry: button opens mini sheet with same case controls as PDP.
 */
export function ShopWineCasePicker({
  product,
  size = "sm",
  className,
  triggerLabel,
  analyticsSource = "list",
}: ShopWineCasePickerProps) {
  const { t } = useTranslations();
  const label = triggerLabel ?? t("shop.addCase");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        onClick={() => setOpen(true)}
        className={cn(
          "w-full bg-black hover:bg-black/90 text-white border-black rounded-md",
          className,
        )}
      >
        {label}
      </Button>
      <ShopWineCaseSheet
        product={product}
        open={open}
        onOpenChange={setOpen}
        analyticsSource={analyticsSource}
      />
    </>
  );
}
