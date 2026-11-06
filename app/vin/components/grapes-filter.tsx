"use client";

import { Product } from "@/lib/shopify/types";
import { usePathname } from "next/navigation";
import { useAvailableGrapes } from "../hooks/use-available-grapes";
import { useClientMounted } from "../hooks/use-client-mounted";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import { shouldNavigateShopFilters } from "@/lib/shop/filter-navigation";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
  shopFilterSheetListClassName,
} from "./shop-filter-option";

interface GrapesFilterProps {
  products?: Product[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
  onGrapeSelect?: (grapeName: string) => boolean | void;
  activeGrape?: string;
  /** Request path. Parents pass the SSR fallback so /wine stays in navigation mode. */
  pathname?: string;
}

export function GrapesFilter({
  products = [],
  className,
  mode = "sidebar",
  onSeeAll,
  onGrapeSelect,
  activeGrape,
  pathname: pathnameProp,
}: GrapesFilterProps) {
  const { t } = useTranslations();
  const routerPathname = usePathname();
  const pathname = pathnameProp || routerPathname || "";
  const navigateFilters = shouldNavigateShopFilters(pathname);
  const mounted = useClientMounted();
  const { availableGrapes, toggleGrape } = useAvailableGrapes(products);
  const [active] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const count = active.length + (activeGrape ? 1 : 0);
  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";
  const selectedLabels = [
    ...active,
    ...(activeGrape && !active.includes(activeGrape) ? [activeGrape] : []),
  ];
  const selectionSummary = isSheet
    ? selectedLabels.join(", ") || undefined
    : undefined;

  const listContainerClass =
    mode === "overlay"
      ? ""
      : mode === "drawer"
        ? shopFilterSheetListClassName()
        : "max-h-24 lg:max-h-28 overflow-y-auto pr-1";

  const waitingForProducts = !navigateFilters && products.length === 0;

  if (navigateFilters) {
    if (!mounted || !availableGrapes || availableGrapes.length === 0)
      return null;
  } else if (!waitingForProducts && availableGrapes.length === 0) {
    return null;
  }

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
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={listContainerClass}>
        {waitingForProducts ? (
          <div className="flex flex-col gap-2 py-1" aria-hidden>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-4 w-2/3 animate-pulse rounded bg-foreground/10"
              />
            ))}
          </div>
        ) : (
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
                  className={shopFilterOptionClassName(isOn, {
                    density: isSheet ? "sheet" : "default",
                  })}
                  aria-pressed={isOn}
                  aria-label={t("shop.filterByGrape", { name: g })}
                >
                  <ShopFilterOptionContent selected={isOn}>
                    {g}
                  </ShopFilterOptionContent>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ShopFilterCollapsible>
  );
}
