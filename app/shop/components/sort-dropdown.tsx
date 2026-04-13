"use client";

import React from "react";
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
import { sortOptions, stockSortOptions } from "@/lib/shopify/constants";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";

interface SortDropdownProps {
  className?: string;
}

/** Always light UI: shop shell stays light even when prefers-color-scheme is dark. */
const SHOP_SORT_TRIGGER =
  "justify-self-end -mr-3 font-medium !border-transparent !bg-transparent !shadow-none md:w-32 " +
  "!text-neutral-600 hover:!bg-neutral-100/80 hover:!text-neutral-900 " +
  "data-[placeholder]:!text-neutral-500 dark:data-[placeholder]:!text-neutral-500 " +
  "dark:!border-transparent dark:!bg-transparent dark:!text-neutral-600 dark:hover:!bg-neutral-100/80 dark:hover:!text-neutral-900 " +
  "[&_svg]:!text-neutral-500 dark:[&_svg]:!text-neutral-500";

const SHOP_SORT_CONTENT =
  "z-[100] !border-neutral-200/90 !bg-white !text-neutral-900 shadow-md " +
  "dark:!border-neutral-200/90 dark:!bg-white dark:!text-neutral-900";

const SHOP_SORT_ITEM =
  "!text-neutral-700 data-[highlighted]:!bg-neutral-100 data-[highlighted]:!text-neutral-900 " +
  "dark:!text-neutral-700 dark:data-[highlighted]:!bg-neutral-100 dark:data-[highlighted]:!text-neutral-900";

const SHOP_SORT_SEPARATOR = "!bg-neutral-200 dark:!bg-neutral-200";

/**
 * Shop sort control — v0 baseline layout; colors forced light to match the shop surface
 * (avoids dark: Select styles when the page is visually light).
 */
export function SortDropdown({ className }: SortDropdownProps) {
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
  const displayValue = sort ?? (safeIsB2B ? "in-stock" : undefined);
  const allOptions = safeIsB2B
    ? [...stockSortOptions, ...sortOptions]
    : sortOptions;

  return (
    <Select value={displayValue ?? undefined} onValueChange={setSort}>
      <SelectTrigger size="sm" className={cn(SHOP_SORT_TRIGGER, className)}>
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent align="end" className={SHOP_SORT_CONTENT}>
        <SelectGroup>
          <div className="flex justify-between items-center pr-1">
            <SelectLabel className="px-2 text-xs !text-neutral-500 dark:!text-neutral-500">
              Sort
            </SelectLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-1 h-5 text-xs !text-neutral-500 hover:!bg-transparent hover:!text-neutral-700 dark:!text-neutral-500 dark:hover:!text-neutral-700"
              onClick={() => setSort(null)}
            >
              Clear
            </Button>
          </div>
          <SelectSeparator className={SHOP_SORT_SEPARATOR} />
          {allOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={SHOP_SORT_ITEM}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
