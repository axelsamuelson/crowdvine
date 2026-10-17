"use client";

import { cn } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  SHOP_FARMING_UI_FILTER_VALUES,
  countProductsByFarming,
  type ShopFarmingFilterValue,
  type ShopFarmingUiFilterValue,
} from "@/lib/shop/farming-filter";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

interface FarmingFilterProps {
  products?: Product[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
  onFarmingSelect?: (farming: ShopFarmingFilterValue) => boolean | void;
  activeFarming?: string;
  /** Clean category URL for each farming option when shop filter navigation applies. */
  getFarmingHref?: (farming: ShopFarmingUiFilterValue) => string | null;
}

export function FarmingFilter({
  products = [],
  className,
  mode = "sidebar",
  onSeeAll,
  onFarmingSelect,
  activeFarming,
  getFarmingHref,
}: FarmingFilterProps) {
  const { t } = useTranslations();
  const [active, setActive] = useQueryState(
    "ffarming",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const counts = countProductsByFarming(products);
  const activeUiFarming =
    activeFarming &&
    (SHOP_FARMING_UI_FILTER_VALUES as readonly string[]).includes(activeFarming)
      ? activeFarming
      : undefined;
  // When category navigation hrefs are available, list Organic/Biodynamic for
  // SSR <a href>, but hide values that would land on an empty category.
  const options = getFarmingHref
    ? SHOP_FARMING_UI_FILTER_VALUES.filter((value) => {
        const isOn =
          active.includes(value) || activeUiFarming === value;
        if (isOn) return true;
        return getFarmingHref(value) != null;
      })
    : SHOP_FARMING_UI_FILTER_VALUES.filter(
        (value) => (counts.get(value) ?? 0) > 0,
      );

  if (options.length === 0) return null;

  const selectedCount =
    active.length +
    (activeUiFarming && !active.includes(activeUiFarming) ? 1 : 0);

  const collapsible = mode !== "overlay";

  const toggleFarming = (value: ShopFarmingUiFilterValue) => {
    if (onFarmingSelect) {
      const handled = onFarmingSelect(value);
      if (handled !== false) return;
    }
    setActive(
      active.includes(value)
        ? active.filter((v) => v !== value)
        : [...active, value],
    );
  };

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
      title={t("shop.farming")}
      count={selectedCount}
      collapsible={collapsible}
      // Keep Organic/Biodynamic <a href> in SSR HTML even when collapsed.
      forceMountContent={Boolean(getFarmingHref)}
      headerAction={seeAllButton}
      className={className}
    >
      <div className="flex flex-col gap-0.5">
        {options.map((value) => {
          const isOn = active.includes(value) || activeUiFarming === value;
          const label = t(`product.farming.${value}`);
          const href = getFarmingHref?.(value) ?? null;
          const className = cn(
            "flex w-full text-left transition-all transform cursor-pointer text-sm md:hover:translate-x-1 md:hover:opacity-80",
            isOn
              ? "font-medium translate-x-1"
              : selectedCount > 0
                ? "opacity-60"
                : "",
          );

          if (href) {
            return (
              <a
                key={value}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  toggleFarming(value);
                }}
                className={className}
                aria-pressed={isOn}
                aria-label={t("shop.filterByFarming", { name: label })}
              >
                {label}
              </a>
            );
          }

          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleFarming(value)}
              className={className}
              aria-pressed={isOn}
              aria-label={t("shop.filterByFarming", { name: label })}
            >
              {label}
            </button>
          );
        })}
      </div>
    </ShopFilterCollapsible>
  );
}
