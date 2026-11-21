"use client";

import React from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQueryState, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";
import { sortOptions, stockSortOptions, DEFAULT_B2C_SHOP_SORT, DEFAULT_B2B_SHOP_SORT } from "@/lib/shopify/constants";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useTranslations } from "@/lib/hooks/use-translations";
import { sortOptionMessageKey } from "@/lib/i18n/sort-labels";

interface SortDropdownProps {
  className?: string;
}

/** Theme-following trigger (same muted/foreground tokens as shop body copy). */
const SHOP_SORT_TRIGGER =
  "justify-self-end -mr-3 font-medium border-transparent bg-transparent shadow-none md:w-32 " +
  "text-muted-foreground hover:bg-muted/80 hover:text-foreground " +
  "data-[placeholder]:text-muted-foreground " +
  "[&_svg]:text-muted-foreground";

const SHOP_SORT_CONTENT =
  "z-[100] border-border bg-popover text-popover-foreground shadow-md";

const SHOP_SORT_ITEM =
  "text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground";

const SHOP_SORT_SEPARATOR = "bg-border";

/**
 * Shop sort control — v0 baseline layout; colours follow theme tokens so dark
 * mode stays readable (no forced light neutral-* overrides).
 */
export function SortDropdown({ className }: SortDropdownProps) {
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

  if (!isMounted) {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex h-8 items-center justify-between gap-2 rounded-md px-3 text-sm",
          SHOP_SORT_TRIGGER,
          className,
        )}
      >
        <span className="line-clamp-1">
          {t(sortOptionMessageKey(displayValue))}
        </span>
        <ChevronDownIcon className="size-4 opacity-50" />
      </button>
    );
  }

  return (
    <Select value={displayValue ?? undefined} onValueChange={setSort}>
      <SelectTrigger size="sm" className={cn(SHOP_SORT_TRIGGER, className)}>
        <SelectValue placeholder={t("shop.sortBy")} />
      </SelectTrigger>
      <SelectContent align="end" className={SHOP_SORT_CONTENT}>
        <SelectGroup>
          <div className="flex justify-between items-center pr-1">
            <SelectLabel className="px-2 text-xs text-muted-foreground">
              {t("shop.sort")}
            </SelectLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setSort(null)}
            >
              {t("shop.clear")}
            </Button>
          </div>
          <SelectSeparator className={SHOP_SORT_SEPARATOR} />
          {allOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={SHOP_SORT_ITEM}
            >
              {t(sortOptionMessageKey(option.value))}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
