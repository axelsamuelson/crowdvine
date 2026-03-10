"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useCompetitorFilterCount } from "../hooks/use-filter-count";
import { useProducts } from "../providers/products-provider";

export interface PriceSourceForFilter {
  id: string;
  name: string;
  slug: string;
}

interface CompetitorFilterProps {
  sources: PriceSourceForFilter[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
}

export function CompetitorFilter({
  sources,
  className,
  mode = "sidebar",
  onSeeAll,
}: CompetitorFilterProps) {
  const { availableSourceSlugs } = useProducts();
  const [selectedSlugs, setSelectedSlugs] = useQueryState(
    "fsource",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const count = useCompetitorFilterCount();

  // Only show sources that have at least one wine in the current list
  const sourcesWithWines = useMemo(() => {
    if (!sources?.length) return [];
    if (availableSourceSlugs.length === 0) return []; // no data yet or no wines have offers
    const set = new Set(availableSourceSlugs);
    return sources.filter((s) => set.has(s.slug));
  }, [sources, availableSourceSlugs]);

  if (!sourcesWithWines.length) return null;

  const toggle = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const listContainerClass =
    mode === "sidebar"
      ? "max-h-24 lg:max-h-28 xl:max-h-32 overflow-y-auto pr-1"
      : "";

  return (
    <div className={cn("px-2.5 py-2 rounded-md bg-muted", className)}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold">
          Buy at{" "}
          {count > 0 && (
            <span className="text-foreground/50">({count})</span>
          )}
        </h3>
        {mode === "sidebar" && onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-xs font-medium text-foreground/60 hover:text-foreground/80 transition-colors"
            aria-label="See all filters"
          >
            See all
          </button>
        )}
      </div>
      <div className={listContainerClass}>
        <ul className="flex flex-col gap-0.5">
          {sourcesWithWines.map((source) => {
            const isSelected = selectedSlugs.includes(source.slug);
            return (
              <li key={source.id}>
                <button
                  type="button"
                  onClick={() => toggle(source.slug)}
                  className={cn(
                    "flex w-full text-left transition-all transform cursor-pointer text-sm md:hover:translate-x-1 md:hover:opacity-80",
                    isSelected
                      ? "font-medium translate-x-1"
                      : selectedSlugs.length > 0
                        ? "opacity-60"
                        : "",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Filter by: ${source.name}`}
                >
                  {source.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
