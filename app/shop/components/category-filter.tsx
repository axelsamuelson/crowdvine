"use client";

import { Collection } from "@/lib/shopify/types";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCategoryFilterCount } from "../hooks/use-filter-count";
import { useQueryState, parseAsString } from "nuqs";

interface CategoryFilterProps {
  collections: Collection[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
}

export function CategoryFilter({
  collections,
  className,
  mode = "sidebar",
  onSeeAll,
}: CategoryFilterProps) {
  const params = useParams<{ collection: string }>();
  const [producersParam] = useQueryState(
    "producers",
    parseAsString.withDefault(""),
  );
  const hasSelectedCategory = !!params.collection;
  const categoryCount = useCategoryFilterCount();

  // Parse selected producers from URL parameter
  const selectedProducers = producersParam
    ? producersParam.split(",").filter(Boolean)
    : [];

  const listContainerClass =
    mode === "sidebar"
      ? // Keep this compact on desktop, but allow more room on larger screens.
        "max-h-56 lg:max-h-72 xl:max-h-[420px] overflow-y-auto pr-1"
      : "";

  return (
    <div className={cn("px-3 py-4 rounded-lg bg-muted", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="font-semibold">
          Producers{" "}
          {categoryCount > 0 && (
            <span className="text-foreground/50">({categoryCount})</span>
          )}
        </h3>

        {mode === "sidebar" && onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-xs font-medium text-foreground/60 hover:text-foreground/80 transition-colors"
            aria-label="See all producers and filters"
          >
            See all
          </button>
        )}
      </div>

      <div className={listContainerClass}>
        <ul className="flex flex-col gap-1">
          {collections
            .filter((collection) => collection.handle !== "wine-boxes")
            .map((collection, index) => {
              const isSelected =
                params.collection === collection.handle ||
                selectedProducers.includes(collection.handle);
              return (
                <li key={`${collection.handle}-${index}`}>
                  <Link
                    className={cn(
                      "flex w-full text-left transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80",
                      isSelected
                        ? "font-medium translate-x-1"
                        : hasSelectedCategory || selectedProducers.length > 0
                          ? "opacity-50"
                          : "",
                    )}
                    href={`/shop/${collection.handle}`}
                    aria-pressed={isSelected}
                    aria-label={`Filter by category: ${collection.title}`}
                    prefetch
                  >
                    {collection.title}
                  </Link>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
