"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ShopFilterSearch } from "./shop-filter-search";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

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

/**
 * Custom bottom search sheet (not vaul).
 *
 * Vaul's keyboard repositioning breaks on iOS when the search input is focused:
 * the sheet becomes a blank white panel and the field disappears. This sheet
 * tracks the visual viewport, supports swipe-down dismiss, and keeps the
 * search field pinned above the keyboard.
 */
export function ShopMobileSearchSheet({
  open,
  onOpenChange,
}: ShopMobileSearchSheetProps) {
  const { t } = useTranslations();
  const [mounted, setMounted] = React.useState(false);
  const [keyboardInset, setKeyboardInset] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragOffsetRef = React.useRef(0);
  const dragRef = React.useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

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
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 48 ? inset : 0);
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
          "fixed inset-x-0 z-[70] flex flex-col rounded-t-2xl bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
          !dragging && "transition-[bottom,transform] duration-150 ease-out",
        )}
        style={{
          bottom: keyboardInset,
          transform: `translate3d(0, ${dragOffset}px, 0)`,
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (isInteractiveTarget(event.target)) return;
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          onDragStart(event.clientY);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          onDragMove(event.clientY);
        }}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className="px-4 pb-2 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
          <h2 className="text-left text-lg font-semibold leading-none tracking-tight">
            {t("shop.searchTitle")}
          </h2>
        </div>

        <div className="px-4 pb-10 pt-5">
          <ShopFilterSearch
            id={INPUT_ID}
            autoFocus={false}
            className="[&_input]:h-12 [&_input]:text-base"
          />
          {/* Airy empty space under the field; also a drag target */}
          <div className="h-20" aria-hidden />
        </div>
      </div>
    </div>,
    document.body,
  );
}
