"use client";

import React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DEFAULT_B2B_SHOP_SORT,
  DEFAULT_B2C_SHOP_SORT,
  sortOptions,
  stockSortOptions,
} from "@/lib/shopify/constants";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useTranslations } from "@/lib/hooks/use-translations";
import { sortOptionMessageKey } from "@/lib/i18n/sort-labels";
import { cn } from "@/lib/utils";

type ShopMobileSortSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShopMobileSortSheet({
  open,
  onOpenChange,
}: ShopMobileSortSheetProps) {
  const { t } = useTranslations();
  const [isMounted, setIsMounted] = React.useState(false);
  const isB2B = useB2BPriceMode();
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withOptions({ shallow: false }),
  );

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeIsB2B = isMounted ? isB2B : false;
  const displayValue =
    sort ?? (safeIsB2B ? DEFAULT_B2B_SHOP_SORT : DEFAULT_B2C_SHOP_SORT);
  const allOptions = safeIsB2B
    ? [...stockSortOptions, ...sortOptions]
    : sortOptions;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
          <DrawerTitle>{t("shop.sortBy")}</DrawerTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-foreground/50"
            onClick={() => {
              void setSort(null);
              onOpenChange(false);
            }}
          >
            {t("shop.clear")}
          </Button>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-6">
          <ul className="flex flex-col gap-1">
            {allOptions.map((option) => {
              const selected = displayValue === option.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      void setSort(option.value);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-3 text-left text-sm transition-colors",
                      selected
                        ? "bg-stone-900 font-medium text-white"
                        : "text-foreground hover:bg-stone-100",
                    )}
                  >
                    {t(sortOptionMessageKey(option.value))}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
