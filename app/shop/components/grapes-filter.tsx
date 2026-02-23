"use client";

import { cn } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { useAvailableGrapes } from "../hooks/use-available-grapes";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";

interface GrapesFilterProps {
  products?: Product[];
  className?: string;
}

export function GrapesFilter({ products = [], className }: GrapesFilterProps) {
  const { availableGrapes, toggleGrape } = useAvailableGrapes(products);
  const [active] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const count = active.length;

  // Only show if there are grapes to filter on
  if (!availableGrapes || availableGrapes.length === 0) return null;

  return (
    <div className={cn("px-3 py-4 rounded-md bg-muted", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold">
          Grapes{" "}
          {count > 0 && <span className="text-foreground/50">({count})</span>}
        </h3>
      </div>

      <div className="max-h-40 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1">
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

