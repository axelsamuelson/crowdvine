"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronRight, Minus, Plus, X } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/shopify/types";
import { useSelectedVariant } from "@/components/products/variant-selector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Loader } from "@/components/ui/loader";
import { formatPrice } from "@/lib/shopify/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddToCart } from "./add-to-cart";
import { CaseModeSelector } from "./case-mode-selector";
import { CasePurchaseHelpTrigger } from "./case-purchase-help-trigger";
import { MixedCaseWineGallery } from "./mixed-case-wine-gallery";
import { WineSpecsList } from "@/components/product/wine-specs-list";
import Prose from "@/components/prose";

type PurchaseMode = "same" | "mixed";

export type ProducerWineRow = {
  id: string;
  wine_name: string;
  vintage: string;
  handle: string;
  base_price_cents: number;
  label_image_path?: string | null;
  image_url: string;
  images: { url: string; alt: string }[];
  description?: string | null;
  description_html?: string | null;
  tasting_notes?: string | null;
  grape_varieties?: string | string[] | null;
  color?: string | null;
  appellation?: string | null;
  terroir?: string | null;
  vinification?: string | null;
  abv?: string | null;
  summary?: string | null;
  producer_name?: string | null;
  producer_region?: string | null;
};

const getBaseProductVariant = (product: Product): ProductVariant => {
  return {
    id: product.id,
    title: product.title,
    availableForSale: product.availableForSale,
    selectedOptions: [],
    price: product.priceRange.minVariantPrice,
  };
};

function useSheetSide(): "bottom" | "right" {
  const [side, setSide] = useState<"bottom" | "right">("bottom");
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setSide(mq.matches ? "right" : "bottom");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return side;
}

function dispatchCartRefresh(cart: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cart-refresh", { detail: cart }));
}

function formatGrapes(g: ProducerWineRow["grape_varieties"]): string | null {
  if (g == null) return null;
  if (Array.isArray(g)) return g.map((x) => String(x).trim()).filter(Boolean).join(", ");
  const s = String(g).trim();
  return s || null;
}

function buildWineSpecs(w: ProducerWineRow): Record<string, string> {
  const specs: Record<string, string> = {};
  if (w.producer_region?.trim()) specs["Region"] = w.producer_region.trim();
  if (w.appellation?.trim()) specs["Appellation"] = w.appellation.trim();
  if (w.terroir?.trim()) specs["Terroir"] = w.terroir.trim();
  if (w.vinification?.trim()) specs["Vinification"] = w.vinification.trim();
  if (w.abv?.trim()) specs["ABV"] = w.abv.trim();
  const grapes = formatGrapes(w.grape_varieties);
  if (grapes) specs["Grape varieties"] = grapes;
  if (w.color?.trim()) specs["Color"] = w.color.trim();
  return specs;
}

function MixedCaseQuantityStepper({
  wineId,
  quantity,
  blockPlus,
  onBump,
  compact = false,
}: {
  wineId: string;
  quantity: number;
  blockPlus: boolean;
  onBump: (id: string, delta: number) => void;
  /** Tighter block for wine detail footer (less vertical space). */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex items-center justify-center overflow-hidden rounded-md border-2 border-black bg-black",
        compact ? "max-w-[200px]" : "max-w-[220px]",
      )}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onBump(wineId, -1)}
        disabled={quantity <= 0}
        className={cn(
          "border-r border-gray-700 transition-colors hover:bg-gray-900",
          compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
          quantity <= 0 ? "cursor-not-allowed opacity-40" : "",
        )}
        aria-label="Decrease"
      >
        <Minus className={cn("text-white", compact ? "size-3.5" : "h-4 w-4")} />
      </button>
      <div
        className={cn(
          "min-w-[2.75rem] text-center",
          compact ? "px-3 py-1.5" : "px-4 py-2.5",
        )}
      >
        <span
          className={cn(
            "font-semibold text-white tabular-nums",
            compact ? "text-sm" : "text-base",
          )}
        >
          {quantity}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onBump(wineId, 1)}
        disabled={blockPlus}
        className={cn(
          "border-l border-gray-700 transition-colors hover:bg-gray-900",
          compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
          blockPlus ? "cursor-not-allowed opacity-40" : "",
        )}
        aria-label="Increase"
      >
        <Plus className={cn("text-white", compact ? "size-3.5" : "h-4 w-4")} />
      </button>
    </div>
  );
}

function MixedCaseWineDetailBody({
  wine,
  specs,
  hideTitleBlock = false,
}: {
  wine: ProducerWineRow;
  specs: Record<string, string>;
  /** When true, wine name/vintage is shown in the shell header; skip duplicate title here. */
  hideTitleBlock?: boolean;
}) {
  const tasting = wine.tasting_notes?.trim();
  const tastingLooksHtml = tasting && /<\s*\w+/.test(tasting);

  return (
    <div className="space-y-4 pb-2">
      <MixedCaseWineGallery images={wine.images} className="w-full" />

      {wine.producer_name ? (
        <p className="text-sm text-muted-foreground">{wine.producer_name}</p>
      ) : null}

      <div>
        {!hideTitleBlock ? (
          <h2 className="text-lg font-semibold leading-tight">
            {wine.wine_name}{" "}
            <span className="text-muted-foreground font-normal">{wine.vintage}</span>
          </h2>
        ) : null}
        <p className={cn("text-base font-semibold", !hideTitleBlock && "mt-1")}>
          {formatPrice(String(Math.ceil(wine.base_price_cents / 100)), "SEK")}
          <span className="text-xs font-normal text-muted-foreground"> / bottle</span>
        </p>
      </div>

      {wine.summary?.trim() ? (
        <p className="text-sm font-medium text-foreground/90">{wine.summary.trim()}</p>
      ) : null}

      <WineSpecsList specs={specs} className="text-xs" />

      {wine.description_html?.trim() ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Description
          </h3>
          <Prose html={wine.description_html} className="prose-sm max-w-none" />
        </div>
      ) : wine.description?.trim() ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Description
          </h3>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {wine.description.trim()}
          </p>
        </div>
      ) : null}

      {tasting ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Tasting notes
          </h3>
          {tastingLooksHtml ? (
            <Prose html={tasting} className="prose-sm max-w-none" />
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {tasting}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export interface AddToCartCaseProps {
  product: Product;
  className?: string;
  /** Opens the mixed-case drawer once after mount (e.g. shop → mixed handoff). */
  initialMixedSheetOpen?: boolean;
  /** Fired when the mixed-case sheet `open` state changes (for shop handoff cleanup). */
  onMixedSheetOpenChange?: (open: boolean) => void;
  /** Only render the mixed-case sheet (no PDP segmented control) — shop handoff. */
  sheetOnly?: boolean;
}

/**
 * B2C PDP: choose full case same wine (6) or mixed 6-pack from producer.
 */
export function AddToCartCase({
  product,
  className,
  initialMixedSheetOpen = false,
  onMixedSheetOpenChange,
  sheetOnly = false,
}: AddToCartCaseProps) {
  if (!product.producerId || product.productType !== "wine") {
    return <AddToCart product={product} className={className} />;
  }

  const [mode, setMode] = useState<PurchaseMode>("same");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailWineId, setDetailWineId] = useState<string | null>(null);
  const [wines, setWines] = useState<ProducerWineRow[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [winesError, setWinesError] = useState<string | null>(null);
  const [batchAddError, setBatchAddError] = useState<string | null>(null);
  const [loadingWines, setLoadingWines] = useState(false);
  const [isSamePending, startSameTransition] = useTransition();
  const [isBatchPending, startBatchTransition] = useTransition();
  const sheetSide = useSheetSide();
  const [showTapRowHint, setShowTapRowHint] = useState(false);
  /** Once true, the one-time row hint is never shown again this session. */
  const tapRowHintShownThisSessionRef = useRef(false);
  const mixedAutoOpenDoneRef = useRef(false);

  useEffect(() => {
    if (!initialMixedSheetOpen || mixedAutoOpenDoneRef.current) return;
    mixedAutoOpenDoneRef.current = true;
    setMode("mixed");
    setSheetOpen(true);
  }, [initialMixedSheetOpen]);

  useEffect(() => {
    if (!sheetOpen) {
      setShowTapRowHint(false);
      return;
    }
    if (loadingWines || wines.length === 0) return;
    if (tapRowHintShownThisSessionRef.current) return;

    tapRowHintShownThisSessionRef.current = true;
    setShowTapRowHint(true);
    const timer = window.setTimeout(() => {
      setShowTapRowHint(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [sheetOpen, loadingWines, wines.length]);

  const openRowDetail = useCallback((id: string) => {
    setShowTapRowHint(false);
    setDetailWineId(id);
  }, []);

  const selectedVariant = useSelectedVariant(product);
  const pathname = useParams<{ handle?: string }>();
  const searchParams = useSearchParams();

  const { variants } = product;
  const hasNoVariants = variants.length === 0;
  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined;
  const selectedVariantId = selectedVariant?.id || defaultVariantId;
  const isTargetingProduct =
    pathname.handle === product.id || searchParams.get("pid") === product.id;

  const resolvedVariant = useMemo(() => {
    if (hasNoVariants) return getBaseProductVariant(product);
    if (!isTargetingProduct && !defaultVariantId) return undefined;
    return variants.find((variant) => variant.id === selectedVariantId);
  }, [
    hasNoVariants,
    product,
    isTargetingProduct,
    defaultVariantId,
    variants,
    selectedVariantId,
  ]);

  const totalSelected = useMemo(
    () => Object.values(quantities).reduce((s, n) => s + n, 0),
    [quantities],
  );

  const detailWine = useMemo(
    () => wines.find((w) => w.id === detailWineId) ?? null,
    [wines, detailWineId],
  );

  const detailSpecs = useMemo(
    () => (detailWine ? buildWineSpecs(detailWine) : {}),
    [detailWine],
  );

  const loadProducerWines = useCallback(() => {
    if (!product.producerId) return;
    setLoadingWines(true);
    setWinesError(null);
    fetch(`/api/producers/${product.producerId}/wines`)
      .then(async (res) => {
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.statusText);
        }
        return res.json() as Promise<{ wines?: ProducerWineRow[] }>;
      })
      .then((data) => {
        const list = data.wines ?? [];
        setWines(list);
        setQuantities(Object.fromEntries(list.map((w) => [w.id, 0])));
        setDetailWineId(null);
      })
      .catch(() => {
        setWinesError("Could not load wines. Please try again.");
        setWines([]);
        setQuantities({});
        setDetailWineId(null);
      })
      .finally(() => setLoadingWines(false));
  }, [product.producerId]);

  useEffect(() => {
    if (!sheetOpen) return;
    loadProducerWines();
  }, [sheetOpen, loadProducerWines]);

  const bumpQty = (wineId: string, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[wineId] ?? 0;
      const sumOthers = Object.entries(prev).reduce(
        (s, [id, q]) => (id === wineId ? s : s + q),
        0,
      );
      const next = Math.max(0, Math.min(6, cur + delta));
      if (delta > 0 && sumOthers + next > 6) return prev;
      return { ...prev, [wineId]: next };
    });
  };

  const handleMainCta = () => {
    if (!resolvedVariant) return;
    if (mode === "mixed") {
      setSheetOpen(true);
      return;
    }

    startSameTransition(async () => {
      try {
        const response = await fetch("/api/cart/add-quantity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: resolvedVariant.id,
            quantity: 6,
            source: "producer",
          }),
        });
        if (response.ok) {
          const result = (await response.json()) as { cart?: unknown };
          if (result.cart) dispatchCartRefresh(result.cart);
        }
      } catch {
        /* noop */
      }
    });
  };

  const handleConfirmMixed = () => {
    if (totalSelected !== 6) return;
    setBatchAddError(null);
    startBatchTransition(async () => {
      try {
        const items = Object.entries(quantities)
          .filter(([, q]) => q > 0)
          .map(([id, quantity]) => ({ variantId: id, quantity }));
        const response = await fetch("/api/cart/batch-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        let result: { success?: boolean; cart?: unknown; error?: string } = {};
        try {
          result = (await response.json()) as typeof result;
        } catch {
          /* non-JSON error body */
        }

        if (!response.ok) {
          setBatchAddError(
            typeof result.error === "string" && result.error.trim()
              ? result.error
              : "Could not add mixed case. Please try again.",
          );
          return;
        }

        if (result.cart) {
          dispatchCartRefresh(result.cart);
        }
        setDetailWineId(null);
        setSheetOpen(false);
      } catch {
        setBatchAddError("Network error. Please try again.");
      }
    });
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    onMixedSheetOpenChange?.(open);
    if (open) {
      setBatchAddError(null);
    } else {
      setDetailWineId(null);
      setBatchAddError(null);
    }
  };

  const closeMixedCaseSheet = useCallback(() => {
    setDetailWineId(null);
    setBatchAddError(null);
    setSheetOpen(false);
  }, []);

  const mixedCaseSheet = (
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side={sheetSide}
          className={cn(
            "flex min-h-0 flex-col gap-0 p-0",
            sheetSide === "bottom" &&
              "h-[100dvh] max-h-[100dvh] min-h-0 w-full rounded-t-2xl rounded-b-none border-x-0",
            sheetSide === "right" &&
              cn(
                "h-[100dvh] max-h-[100dvh] w-full transition-[max-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                detailWineId ? "sm:max-w-4xl" : "sm:max-w-md",
              ),
          )}
        >
          {sheetSide === "right" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
              <div
                className={cn(
                  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden transition-[flex-basis] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
                  detailWineId
                    ? "basis-1/2 shrink-0 grow-0"
                    : "min-w-0 basis-full shrink grow",
                )}
              >
                <MixedCaseWineListPanel
                  loadingWines={loadingWines}
                  winesError={winesError}
                  wines={wines}
                  quantities={quantities}
                  totalSelected={totalSelected}
                  bumpQty={bumpQty}
                  onOpenDetail={openRowDetail}
                  producerName={product.producerName}
                  mixedCaseHeader
                  mixedCaseHeaderSheetSide={sheetSide}
                  showTapRowHint={showTapRowHint}
                  onCloseMixedCase={closeMixedCaseSheet}
                />
              </div>
              <div
                className={cn(
                  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background transition-[flex-basis] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
                  detailWineId
                    ? "basis-1/2 shrink-0 grow-0 border-l border-border"
                    : "basis-0 shrink-0 grow-0 overflow-hidden border-l-0",
                )}
              >
                {detailWine ? (
                  <MixedCaseWineDetailPanel
                    wine={detailWine}
                    specs={detailSpecs}
                    quantity={quantities[detailWine.id] ?? 0}
                    totalSelected={totalSelected}
                    bumpQty={bumpQty}
                    onBack={() => setDetailWineId(null)}
                    layout="desktop-split"
                  />
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6 text-sm text-muted-foreground">
                    Select a wine to view details
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <MixedCaseWineListPanel
                loadingWines={loadingWines}
                winesError={winesError}
                wines={wines}
                quantities={quantities}
                totalSelected={totalSelected}
                bumpQty={bumpQty}
                onOpenDetail={openRowDetail}
                producerName={product.producerName}
                mixedCaseHeader
                mixedCaseHeaderSheetSide={sheetSide}
                showTapRowHint={showTapRowHint}
                onCloseMixedCase={closeMixedCaseSheet}
              />
              {/*
                Must stay under SheetContent in the DOM. Portaling to document.body
                made Radix treat taps as outside the sheet and closed the whole drawer.
              */}
              <AnimatePresence>
                {sheetOpen && sheetSide === "bottom" && detailWineId && detailWine ? (
                  <motion.div
                    key="mixed-case-detail-in-sheet"
                    className="pointer-events-none fixed inset-0 z-[60] flex flex-col"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      type="button"
                      aria-label="Close wine details"
                      className="pointer-events-auto absolute inset-0 bg-black/70"
                      onClick={() => setDetailWineId(null)}
                    />
                    <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col justify-end">
                      <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`mixed-case-detail-${detailWine.id}`}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{
                          duration: 0.32,
                          ease: [0.32, 0.72, 0, 1],
                        }}
                        className="pointer-events-auto flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-x-hidden rounded-t-2xl border-t border-border bg-background shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
                      >
                        <div className="flex h-full min-h-0 min-w-0 flex-1 basis-0 flex-col pt-[env(safe-area-inset-top)]">
                          <MixedCaseWineDetailPanel
                            wine={detailWine}
                            specs={detailSpecs}
                            quantity={quantities[detailWine.id] ?? 0}
                            totalSelected={totalSelected}
                            bumpQty={bumpQty}
                            onBack={() => setDetailWineId(null)}
                            layout="mobile-fullscreen"
                          />
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )}

          {batchAddError ? (
            <div
              className="shrink-0 border-t border-destructive/30 bg-destructive/10 px-6 py-3"
              role="alert"
            >
              <p className="text-sm text-destructive">{batchAddError}</p>
            </div>
          ) : null}

          <SheetFooter className="shrink-0 border-t border-border bg-background px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="w-full bg-black hover:bg-black/90 text-white"
              disabled={
                totalSelected !== 6 || isBatchPending || loadingWines
              }
              onClick={handleConfirmMixed}
            >
              {isBatchPending ? (
                <Loader size="default" />
              ) : (
                "Add mixed case"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
  );

  if (sheetOnly) {
    return mixedCaseSheet;
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex justify-end">
        <CasePurchaseHelpTrigger />
      </div>
      <CaseModeSelector
        mode={mode}
        onModeChange={setMode}
        onConfirm={handleMainCta}
        disabled={!resolvedVariant || (mode === "mixed" && isBatchPending)}
        pending={mode === "same" && isSamePending}
        label={!resolvedVariant ? "Select a variant" : "Add case"}
      />

      {mixedCaseSheet}
    </div>
  );
}

function MixedCaseWineListPanel({
  loadingWines,
  winesError,
  wines,
  quantities,
  totalSelected,
  bumpQty,
  onOpenDetail,
  producerName,
  mixedCaseHeader = false,
  mixedCaseHeaderSheetSide,
  showTapRowHint = false,
  onCloseMixedCase,
}: {
  loadingWines: boolean;
  winesError: string | null;
  wines: ProducerWineRow[];
  quantities: Record<string, number>;
  totalSelected: number;
  bumpQty: (id: string, d: number) => void;
  onOpenDetail: (id: string) => void;
  producerName?: string | null;
  mixedCaseHeader?: boolean;
  /** Controls top padding for sticky list header (align with sheet close on desktop). */
  mixedCaseHeaderSheetSide?: "bottom" | "right";
  showTapRowHint?: boolean;
  /** Close the mixed-case sheet (list view). */
  onCloseMixedCase?: () => void;
}) {
  const listBody = (
    <>
      {loadingWines ? (
        <div className="flex justify-center py-12">
          <Loader size="default" />
        </div>
      ) : winesError ? (
        <p className="text-sm text-destructive">{winesError}</p>
      ) : wines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No wines found for this producer.
        </p>
      ) : (
        <ul className="space-y-4">
          {wines.map((w) => {
            const q = quantities[w.id] ?? 0;
            const blockPlus = q >= 6 || totalSelected >= 6;
            return (
              <li
                key={w.id}
                className="flex items-stretch gap-2 overflow-hidden rounded-lg border border-border"
              >
                <button
                  type="button"
                  className={cn(
                    "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none ring-offset-background transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    "hover:bg-[color:var(--color-background-secondary,hsl(var(--secondary)))] active:scale-[0.99] motion-reduce:active:scale-100",
                  )}
                  onClick={() => onOpenDetail(w.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={w.image_url}
                    alt=""
                    className="size-14 shrink-0 rounded object-cover bg-muted"
                  />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-sm font-medium leading-snug">
                      {w.wine_name}{" "}
                      <span className="text-muted-foreground font-normal">
                        {w.vintage}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatPrice(
                        String(Math.ceil(w.base_price_cents / 100)),
                        "SEK",
                      )}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-[color:var(--color-text-secondary,hsl(var(--muted-foreground)))]"
                    aria-hidden
                  />
                </button>
                <div className="flex shrink-0 items-center pr-2">
                  <MixedCaseQuantityStepper
                    wineId={w.id}
                    quantity={q}
                    blockPlus={blockPlus}
                    onBump={bumpQty}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (mixedCaseHeader) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "sticky top-0 z-10 shrink-0 border-b border-border bg-background px-6 pb-3",
            mixedCaseHeaderSheetSide === "bottom"
              ? "pt-[max(1.25rem,env(safe-area-inset-top))]"
              : "pt-4",
          )}
        >
          {onCloseMixedCase ? (
            <div className="mb-3 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 -mr-2 h-9 text-muted-foreground hover:text-foreground"
                onClick={onCloseMixedCase}
              >
                <X className="size-4 shrink-0" aria-hidden />
                Close
              </Button>
            </div>
          ) : null}
          <SheetHeader className="text-left space-y-1 pr-8">
            <SheetTitle>Mixed case (6 bottles)</SheetTitle>
            <SheetDescription>
              Choose how many bottles of each wine from{" "}
              {producerName ?? "this producer"}.
            </SheetDescription>
          </SheetHeader>
          <p className="mt-3 text-sm font-semibold tabular-nums">
            {totalSelected}/6 bottles selected
          </p>
          {showTapRowHint ? (
            <p
              className="mt-2 text-xs text-muted-foreground"
              role="status"
            >
              Tap a wine to learn more
            </p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{listBody}</div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{listBody}</div>
  );
}

function MixedCaseWineDetailPanel({
  wine,
  specs,
  quantity,
  totalSelected,
  bumpQty,
  onBack,
  layout = "desktop-split",
}: {
  wine: ProducerWineRow;
  specs: Record<string, string>;
  quantity: number;
  totalSelected: number;
  bumpQty: (id: string, d: number) => void;
  onBack: () => void;
  layout?: "desktop-split" | "mobile-fullscreen";
}) {
  const blockPlus = quantity >= 6 || totalSelected >= 6;
  const titleId = `mixed-case-detail-${wine.id}`;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 basis-0 flex-col">
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border px-4",
          layout === "desktop-split"
            ? "pb-3 pt-4 pr-12"
            : "py-3 pr-14 pt-2",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1 px-2 text-foreground"
          onClick={onBack}
        >
          ← Back
        </Button>
        {layout === "mobile-fullscreen" ? (
          <p
            id={titleId}
            className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
          >
            {wine.wine_name} {wine.vintage}
          </p>
        ) : null}
      </div>
      <div
        data-mixed-case-detail-scroll
        className="min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] [transform:translateZ(0)]"
      >
        <MixedCaseWineDetailBody
          wine={wine}
          specs={specs}
          hideTitleBlock={layout === "mobile-fullscreen"}
        />
      </div>
      <div
        className={cn(
          "shrink-0 border-t border-border bg-background px-4 py-2",
          layout === "mobile-fullscreen" &&
            "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        <p className="mb-1 text-center text-[11px] leading-tight text-muted-foreground">
          Bottles in this case
        </p>
        <MixedCaseQuantityStepper
          wineId={wine.id}
          quantity={quantity}
          blockPlus={blockPlus}
          onBump={bumpQty}
          compact
        />
      </div>
    </div>
  );
}
