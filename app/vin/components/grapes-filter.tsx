"use client";

import { cn } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { useAvailableGrapes } from "../hooks/use-available-grapes";
import { useClientMounted } from "../hooks/use-client-mounted";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

interface GrapesFilterProps {
  products?: Product[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
  onGrapeSelect?: (grapeName: string) => boolean | void;
  activeGrape?: string;
}

export function GrapesFilter({
  products = [],
  className,
  mode = "sidebar",
  onSeeAll,
  onGrapeSelect,
  activeGrape,
}: GrapesFilterProps) {
  const { t } = useTranslations();
  const mounted = useClientMounted();
  const { availableGrapes, toggleGrape } = useAvailableGrapes(products);
  const [active] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const count = active.length + (activeGrape ? 1 : 0);
  const collapsible = mode !== "overlay";

  const listContainerClass =
    mode === "overlay"
      ? ""
      : "max-h-24 lg:max-h-28 overflow-y-auto pr-1";

  if (!mounted || !availableGrapes || availableGrapes.length === 0) return null;

  const seeAllButton =
    mode === "sidebar" && onSeeAll ? (
      <button
        type="button"
        onClick={onSeeAll}
        className="text-xs font-medium text-foreground/60 hover:text-foreground/80 transition-colors"
        aria-label={t("shop.seeAllFilters")}
      >
        {t("shop.seeAll")}
      </button>
    ) : null;

  return (
    <ShopFilterCollapsible
      title={t("shop.grapes")}
      count={count}
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={listContainerClass}>
        <div className="flex flex-col gap-0.5">
          {availableGrapes.map((g) => {
            const isOn = active.includes(g) || activeGrape === g;
            const handleClick = () => {
              if (onGrapeSelect) {
                const handled = onGrapeSelect(g);
                if (handled !== false) return;
              }
              toggleGrape(g);
            };
            return (
              <button
                key={g}
                type="button"
                onClick={handleClick}
                className={cn(
                  "flex w-full text-left transition-all transform cursor-pointer text-sm md:hover:translate-x-1 md:hover:opacity-80",
                  isOn
                    ? "font-medium translate-x-1"
                    : active.length > 0 || activeGrape
                      ? "opacity-60"
                      : "",
                )}
                aria-pressed={isOn}
                aria-label={t("shop.filterByGrape", { name: g })}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>
    </ShopFilterCollapsible>
  );
}
