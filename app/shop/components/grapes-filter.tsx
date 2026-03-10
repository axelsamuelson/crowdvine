"use client";

import { cn } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { useAvailableGrapes } from "../hooks/use-available-grapes";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";

interface GrapesFilterProps {
  products?: Product[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
}

export function GrapesFilter({
  products = [],
  className,
  mode = "sidebar",
  onSeeAll,
}: GrapesFilterProps) {
  const { availableGrapes, toggleGrape } = useAvailableGrapes(products);
  const [active] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const count = active.length;

  // Only show if there are grapes to filter on
  if (!availableGrapes || availableGrapes.length === 0) return null;

  return (
    <div className={cn("px-2.5 py-2 rounded-md bg-muted", className)}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold">
          Grapes{" "}
          {count > 0 && <span className="text-foreground/50">({count})</span>}
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

      <div className="max-h-24 lg:max-h-28 overflow-y-auto pr-1">
        <div className="flex flex-col gap-0.5">
          {availableGrapes.map((g) => {
            const isOn = active.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGrape(g)}
                className={cn(
                  "flex w-full text-left transition-all transform cursor-pointer text-sm md:hover:translate-x-1 md:hover:opacity-80",
                  isOn
                    ? "font-medium translate-x-1"
                    : active.length > 0
                      ? "opacity-60"
                      : "",
                )}
                aria-pressed={isOn}
                aria-label={`Filter by grape: ${g}`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

