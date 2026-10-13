"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { Grape, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/components/shop/products-provider";
import {
  ShopFilterSearch,
  type ShopFilterSearchHandle,
} from "./shop-filter-search";
import { ShopSearchScopeTabs } from "./shop-search-scope-tabs";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";
import {
  SHOP_SEARCH_SCOPES,
  buildShopSearchSuggestions,
  countProductsBySearchScope,
  type ShopSearchScope,
  type ShopSearchSuggestion,
} from "@/lib/shop/shop-product-search";

type ShopMobileSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DISMISS_DISTANCE_PX = 96;
const DISMISS_VELOCITY = 0.55;
const INPUT_ID = "shop-search-dock";

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, button, a, [role='textbox']"));
}

function suggestionIcon(kind: ShopSearchSuggestion["kind"]) {
  switch (kind) {
    case "producer":
      return Store;
    case "grape":
      return Grape;
    case "wine":
    default:
      return Search;
  }
}

/**
 * Custom bottom search sheet (not vaul).
 *
 * Includes scope tabs + live suggestions. Tracks visualViewport so the sheet
 * stays above the iOS keyboard and supports swipe-down dismiss.
 */
export function ShopMobileSearchSheet({
  open,
  onOpenChange,
}: ShopMobileSearchSheetProps) {
  const { t } = useTranslations();
  const { originalProducts } = useProducts();
  const [mounted, setMounted] = React.useState(false);
  const [keyboardInset, setKeyboardInset] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const dragOffsetRef = React.useRef(0);
  const searchRef = React.useRef<ShopFilterSearchHandle>(null);
  const dragRef = React.useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  const [qscope, setQscope] = useQueryState(
    "qscope",
    parseAsStringLiteral([...SHOP_SEARCH_SCOPES])
      .withDefault("all")
      .withOptions({ shallow: true, history: "replace" }),
  );

  const activeScope: ShopSearchScope = qscope;
  const trimmedDraft = draft.trim();

  const scopeCounts = React.useMemo(
    () => countProductsBySearchScope(originalProducts, trimmedDraft),
    [originalProducts, trimmedDraft],
  );

  const suggestions = React.useMemo(
    () => buildShopSearchSuggestions(originalProducts, trimmedDraft, 8),
    [originalProducts, trimmedDraft],
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setKeyboardInset(0);
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setDragging(false);
      dragRef.current = null;
      return;
    }

    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) {
        setKeyboardInset(0);
        setViewportHeight(window.innerHeight);
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
      setViewportHeight(vv.height);
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
      input?.focus({ preventScroll: true });
    }, 80);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  const close = React.useCallback(() => {
    const input = document.getElementById(INPUT_ID) as HTMLInputElement | null;
    input?.blur();
    onOpenChange(false);
  }, [onOpenChange]);

  const setScope = (scope: ShopSearchScope) => {
    void setQscope(scope === "all" ? null : scope);
  };

  const applySuggestion = (suggestion: ShopSearchSuggestion) => {
    searchRef.current?.setQuery(suggestion.label);
    void setQscope(suggestion.kind);
    close();
  };

  const suggestionKindLabel = (kind: ShopSearchSuggestion["kind"]) => {
    switch (kind) {
      case "producer":
        return t("shop.searchScopeProducer");
      case "grape":
        return t("shop.searchScopeGrape");
      case "wine":
      default:
        return t("shop.searchScopeWine");
    }
  };

  const onDragStart = (clientY: number) => {
    dragRef.current = {
      startY: clientY,
      lastY: clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    setDragging(true);
  };

  const onDragMove = (clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const now = performance.now();
    const dy = clientY - drag.startY;
    const dt = Math.max(now - drag.lastT, 1);
    drag.velocity = (clientY - drag.lastY) / dt;
    drag.lastY = clientY;
    drag.lastT = now;
    dragOffsetRef.current = Math.max(0, dy);
    setDragOffset(dragOffsetRef.current);
  };

  const onDragEnd = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag) {
      dragOffsetRef.current = 0;
      setDragOffset(0);
      return;
    }
    const shouldDismiss =
      dragOffsetRef.current > DISMISS_DISTANCE_PX ||
      drag.velocity > DISMISS_VELOCITY;
    if (shouldDismiss) {
      close();
      return;
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  if (!mounted || !open) return null;

  const sheetMaxHeight =
    viewportHeight > 0
      ? Math.max(280, Math.round(viewportHeight - 12))
      : undefined;

  return createPortal(
    <div className="md:hidden" role="presentation">
      <button
        type="button"
        aria-label={t("shop.close")}
        className="fixed inset-0 z-[60] cursor-default bg-black/80"
        style={{ opacity: Math.max(0.25, 1 - dragOffset / 280) }}
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("shop.searchTitle")}
        className={cn(
          "fixed inset-x-0 z-[70] flex max-h-[min(85dvh,100%)] flex-col rounded-t-2xl bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
          !dragging && "transition-[bottom,transform] duration-150 ease-out",
        )}
        style={{
          bottom: keyboardInset,
          transform: `translate3d(0, ${dragOffset}px, 0)`,
          maxHeight: sheetMaxHeight,
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (isInteractiveTarget(event.target)) return;
          (event.currentTarget as HTMLElement).setPointerCapture(
            event.pointerId,
          );
          onDragStart(event.clientY);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          onDragMove(event.clientY);
        }}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className="shrink-0 px-4 pb-2 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
          <h2 className="text-left text-lg font-semibold leading-none tracking-tight">
            {t("shop.searchTitle")}
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3">
          <ShopFilterSearch
            ref={searchRef}
            id={INPUT_ID}
            autoFocus={false}
            className="[&_input]:h-12 [&_input]:text-base"
            onDraftChange={setDraft}
            onCommit={() => close()}
          />

          {trimmedDraft ? (
            <ShopSearchScopeTabs
              value={activeScope}
              onChange={setScope}
              counts={scopeCounts}
              className="shrink-0"
            />
          ) : null}

          {trimmedDraft && suggestions.length > 0 ? (
            <ul
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-neutral-200/80"
              aria-label={t("shop.searchSuggestionsAria")}
            >
              {suggestions.map((suggestion) => {
                const Icon = suggestionIcon(suggestion.kind);
                return (
                  <li key={suggestion.id} className="border-b border-neutral-100 last:border-b-0">
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900">
                          {suggestion.label}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {suggestionKindLabel(suggestion.kind)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="min-h-8 flex-1" aria-hidden />
          )}

          <Button
            type="button"
            className="h-12 w-full shrink-0 cursor-pointer rounded-md bg-black text-base text-white hover:bg-black/90"
            onClick={() => {
              searchRef.current?.commit();
            }}
          >
            {t("shop.searchConfirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
