"use client";

import { useMemo } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useCompetitorFilterCount } from "../hooks/use-filter-count";
import { useClientMounted } from "../hooks/use-client-mounted";
import { useProducts } from "@/components/shop/products-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
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
}

export function CompetitorFilter({
  sources,
  className,
  mode = "sidebar",
  onSeeAll,
}: CompetitorFilterProps) {
  const { t } = useTranslations();
  const mounted = useClientMounted();
  const { availableSourceSlugs } = useProducts();
  const [selectedSlugs, setSelectedSlugs] = useQueryState(
    "fsource",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const count = useCompetitorFilterCount();
  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";

  const sourcesWithWines = useMemo(() => {
    if (!sources?.length) return [];
    if (availableSourceSlugs.length === 0) return [];
    const set = new Set(availableSourceSlugs);
    return sources.filter((s) => set.has(s.slug));
  }, [sources, availableSourceSlugs]);

  if (!mounted || !sourcesWithWines.length) return null;

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
        <ul className="flex flex-col gap-0.5">
          {sourcesWithWines.map((source) => {
            const isSelected = selectedSlugs.includes(source.slug);
            return (
              <li key={source.id}>
                <button
                  type="button"
                  onClick={() => toggle(source.slug)}
                  className={shopFilterOptionClassName(isSelected, {
                    density: isSheet ? "sheet" : "default",
                  })}
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
      </div>
    </ShopFilterCollapsible>
  );
}
