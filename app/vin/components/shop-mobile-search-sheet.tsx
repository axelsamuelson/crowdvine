"use client";

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
          <DrawerTitle>{t("shop.searchTitle")}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8">
          {open ? (
            <ShopFilterSearch id="shop-search-dock" autoFocus />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
