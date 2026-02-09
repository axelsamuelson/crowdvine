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

  // Avoid hydration mismatch: isB2B may differ between server and client
  const safeIsB2B = isMounted ? isB2B : false;
  const displayValue = sort ?? (safeIsB2B ? "in-stock" : undefined);
  const allOptions = safeIsB2B
    ? [...stockSortOptions, ...sortOptions]
    : sortOptions;

  return (
    <Select value={displayValue ?? undefined} onValueChange={setSort}>
      <SelectTrigger
        size="sm"
        className={cn(
          "justify-self-end -mr-3 font-medium bg-transparent border-none shadow-none md:w-32 hover:bg-muted/50",
          className,
        )}
      >
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <div className="flex justify-between items-center pr-1">
            <SelectLabel className="text-xs">Sort</SelectLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-1 h-5 text-xs text-muted-foreground"
              onClick={() => setSort(null)}
            >
              Clear
            </Button>
          </div>
          <SelectSeparator />
          {allOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
