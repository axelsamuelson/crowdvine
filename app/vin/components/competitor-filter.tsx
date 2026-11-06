"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { cn } from "@/lib/utils";
import { useCompetitorFilterCount } from "../hooks/use-filter-count";
import { useClientMounted } from "../hooks/use-client-mounted";
import { useProducts } from "@/components/shop/products-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import { shouldNavigateShopFilters } from "@/lib/shop/filter-navigation";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
  shopFilterSheetListClassName,
} from "./shop-filter-option";

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
  /** Sources with an approved offer somewhere in the catalog. */
  catalogSourceSlugs?: readonly string[];
  /** Request path. Parents pass the SSR fallback so /wine stays in navigation mode. */
  pathname?: string;
}

export function CompetitorFilter({
  sources,
  className,
  mode = "sidebar",
  onSeeAll,
  catalogSourceSlugs,
  pathname: pathnameProp,
}: CompetitorFilterProps) {
  const { t } = useTranslations();
  const routerPathname = usePathname();
  const pathname = pathnameProp || routerPathname || "";
  const navigateFilters = shouldNavigateShopFilters(pathname);
  const mounted = useClientMounted();
  const { availableSourceSlugs, originalProducts } = useProducts();
  const countsReady = originalProducts.length > 0;
  const [selectedSlugs, setSelectedSlugs] = useQueryState(
    "fsource",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const count = useCompetitorFilterCount();
  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";
  const queryMode = !navigateFilters && catalogSourceSlugs != null;

  const sourcesWithWines = useMemo(() => {
    if (!sources?.length) return [];
    if (!queryMode) {
      if (availableSourceSlugs.length === 0) return [];
      const set = new Set(availableSourceSlugs);
      return sources.filter((s) => set.has(s.slug));
    }
    const catalog = new Set(catalogSourceSlugs ?? []);
    return sources.filter(
      (s) => catalog.has(s.slug) || selectedSlugs.includes(s.slug),
    );
  }, [
    sources,
    queryMode,
    catalogSourceSlugs,
    availableSourceSlugs,
    selectedSlugs,
  ]);

  if (queryMode) {
    if (sourcesWithWines.length === 0) return null;
  } else if (!mounted || !sourcesWithWines.length) {
    return null;
  }

  const selectionSummary = isSheet
    ? sourcesWithWines
        .filter((source) => selectedSlugs.includes(source.slug))
        .map((source) => source.name)
        .join(", ") || undefined
    : undefined;

  const toggle = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const listContainerClass =
    mode === "drawer"
      ? shopFilterSheetListClassName()
      : mode === "sidebar"
        ? "max-h-24 lg:max-h-28 xl:max-h-32 overflow-y-auto pr-1"
        : "";

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
      title={t("shop.buyAt")}
      count={count}
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={listContainerClass}>
        {queryMode && !countsReady ? (
          <div className="flex flex-col gap-2 py-1" aria-hidden>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-4 w-2/3 animate-pulse rounded bg-foreground/10"
              />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sourcesWithWines.map((source) => {
              const isSelected = selectedSlugs.includes(source.slug);
              const unavailable =
                queryMode &&
                countsReady &&
                !availableSourceSlugs.includes(source.slug) &&
                !isSelected;
              const optionClassName = shopFilterOptionClassName(isSelected, {
                density: isSheet ? "sheet" : "default",
              });
              if (unavailable) {
                return (
                  <li key={source.id}>
                    <button
                      type="button"
                      disabled
                      className={cn(
                        optionClassName,
                        "cursor-not-allowed opacity-40 md:hover:text-neutral-500",
                      )}
                      aria-disabled
                      aria-label={t("shop.filterBySource", {
                        name: source.name,
                      })}
                    >
                      <ShopFilterOptionContent selected={false}>
                        {source.name} (0)
                      </ShopFilterOptionContent>
                    </button>
                  </li>
                );
              }
              return (
                <li key={source.id}>
                  <button
                    type="button"
                    onClick={() => toggle(source.slug)}
                    className={optionClassName}
                    aria-pressed={isSelected}
                    aria-label={t("shop.filterBySource", { name: source.name })}
                  >
                    <ShopFilterOptionContent selected={isSelected}>
                      {source.name}
                    </ShopFilterOptionContent>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ShopFilterCollapsible>
  );
}
