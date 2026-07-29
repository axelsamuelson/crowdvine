"use client";

import { Collection, Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";
import { ShopBreadcrumb } from "./shop-breadcrumb";
import { ResultsCount } from "./results-count";
import { SortDropdown } from "./sort-dropdown";
import { X } from "lucide-react";
import { useTranslations } from "@/lib/hooks/use-translations";

export default function ResultsControls({
  collections,
  products,
  className,
  breadcrumbLabel,
  producerProfileHref,
  producerProfileLabel,
  searchQuery,
  onClearSearch,
}: {
  collections: Pick<Collection, "handle" | "title">[];
  products: Product[];
  className?: string;
  breadcrumbLabel?: string;
  producerProfileHref?: string;
  producerProfileLabel?: string;
  searchQuery?: string;
  onClearSearch?: () => void;
}) {
  const { t } = useTranslations();
  const q = searchQuery?.trim() ?? "";

  return (
    <div className={cn("mb-1 w-full pr-sides", className)}>
      <div className="grid w-full grid-cols-3 items-center">
        <ShopBreadcrumb
          collections={collections}
          className="ml-1"
          breadcrumbLabel={breadcrumbLabel}
          producerProfileHref={producerProfileHref}
          producerProfileLabel={producerProfileLabel}
        />

        <ResultsCount count={products.length} />

        <SortDropdown />
      </div>

      {q ? (
        <div className="ml-1 mt-2 flex items-center gap-2">
          <span
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-neutral-200/90 bg-[#f3f4f6] px-2.5 py-1 text-xs text-gray-800 dark:border-neutral-200/90 dark:bg-[#f3f4f6] dark:text-gray-800"
            title={t("shop.searchingFor", { query: q })}
          >
            <span className="truncate">
              {t("shop.searchingFor", { query: q })}
            </span>
            {onClearSearch ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-200/80 dark:hover:text-neutral-900"
                aria-label={t("shop.clearSearch")}
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
