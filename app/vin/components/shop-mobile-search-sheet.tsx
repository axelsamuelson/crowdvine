"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ShopFilterSearch } from "./shop-filter-search";
import { useTranslations } from "@/lib/hooks/use-translations";

type ShopMobileSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShopMobileSearchSheet({
  open,
  onOpenChange,
}: ShopMobileSearchSheetProps) {
  const { t } = useTranslations();
  const focusTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!open) {
      if (focusTimerRef.current != null) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      return;
    }

    // Focus after the drawer has opened so the sheet stays visible on iOS
    // when the keyboard appears (immediate autofocus races the animation).
    focusTimerRef.current = window.setTimeout(() => {
      const input = document.getElementById(
        "shop-search-dock",
      ) as HTMLInputElement | null;
      input?.focus({ preventScroll: true });
      focusTimerRef.current = null;
    }, 320);

    return () => {
      if (focusTimerRef.current != null) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [open]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      // Same drag-to-dismiss as sort; skip background scale so iOS keyboard
      // does not push the sheet off-screen.
      shouldScaleBackground={false}
      repositionInputs
    >
      <DrawerContent className="min-h-[42vh] max-h-[70vh]">
        <DrawerHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-4 pt-2 text-left">
          <DrawerTitle>{t("shop.searchTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-1 flex-col px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-1">
          {open ? (
            <ShopFilterSearch
              id="shop-search-dock"
              autoFocus={false}
              className="[&_input]:h-12 [&_input]:text-base"
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
