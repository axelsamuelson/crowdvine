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

/**
 * Mobile search uses a custom bottom sheet (not vaul).
 * Vaul's background-scale + keyboard repositioning races autofocus on iOS and
 * leaves only the keyboard visible with the sheet off-screen.
 */
export function ShopMobileSearchSheet({
  open,
  onOpenChange,
}: ShopMobileSearchSheetProps) {
  const { t } = useTranslations();
  const [mounted, setMounted] = React.useState(false);
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const inputId = "shop-search-dock";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setKeyboardOffset(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const syncKeyboard = () => {
      // Distance between layout viewport and visible viewport ≈ keyboard height.
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset > 40 ? offset : 0);
    };

    syncKeyboard();
    vv.addEventListener("resize", syncKeyboard);
    vv.addEventListener("scroll", syncKeyboard);
    return () => {
      vv.removeEventListener("resize", syncKeyboard);
      vv.removeEventListener("scroll", syncKeyboard);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus after the sheet paints so it stays on-screen when the keyboard opens.
    const timer = window.setTimeout(() => {
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      input?.focus({ preventScroll: true });
    }, 50);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="md:hidden" role="presentation">
      <button
        type="button"
        aria-label={t("shop.clear")}
        className="fixed inset-0 z-[60] cursor-default bg-black/80"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("shop.searchTitle")}
        className={cn(
          "fixed inset-x-0 z-[70] flex flex-col rounded-t-lg bg-background shadow-lg",
          "transition-[bottom] duration-150 ease-out",
        )}
        style={{
          bottom: keyboardOffset,
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto mt-3 h-2 w-[100px] rounded-full bg-muted" />
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {t("shop.searchTitle")}
          </h2>
        </div>
        <div className="px-4 pb-2">
          <ShopFilterSearch id={inputId} autoFocus={false} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
