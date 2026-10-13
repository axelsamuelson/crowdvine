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

    // Wait until the drawer has painted before focusing. Autofocus on mount
    // races the open animation and, with the iOS keyboard, leaves the sheet
    // off-screen while only the keyboard is visible.
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
      // Scaling the page behind the drawer + iOS keyboard makes the sheet
      // disappear into empty space. Keep search flat like a normal sheet.
      shouldScaleBackground={false}
      // Let vaul lift the sheet above the keyboard once the input is focused.
      repositionInputs
    >
      <DrawerContent className="max-h-[min(70vh,100dvh)]">
        <DrawerHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2 text-left">
          <DrawerTitle>{t("shop.searchTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {open ? (
            <ShopFilterSearch id="shop-search-dock" autoFocus={false} />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
