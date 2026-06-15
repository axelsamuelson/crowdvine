"use client";

import { cn } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { useClientMounted } from "../hooks/use-client-mounted";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  SHOP_FARMING_FILTER_VALUES,
  countProductsByFarming,
  type ShopFarmingFilterValue,
} from "@/lib/shop/farming-filter";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

interface FarmingFilterProps {
  products?: Product[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
  onFarmingSelect?: (farming: ShopFarmingFilterValue) => boolean | void;
  activeFarming?: string;
}

export function FarmingFilter({
  products = [],
  className,
  mode = "sidebar",
  onSeeAll,
  onFarmingSelect,
  activeFarming,
}: FarmingFilterProps) {
  const { t } = useTranslations();
  const mounted = useClientMounted();
  const [active, setActive] = useQueryState(
    "ffarming",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const counts = countProductsByFarming(products);
  const options = SHOP_FARMING_FILTER_VALUES.filter(
    (value) => (counts.get(value) ?? 0) > 0,
  );

  if (!mounted || options.length === 0) return null;

  const selectedCount =
    active.length + (activeFarming && !active.includes(activeFarming) ? 1 : 0);

  const collapsible = mode !== "overlay";

  const toggleFarming = (value: ShopFarmingFilterValue) => {
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
      headerAction={seeAllButton}
      className={className}
    >
      <div className="flex flex-col gap-0.5">
        {options.map((value) => {
          const isOn = active.includes(value) || activeFarming === value;
          const label = t(`product.farming.${value}`);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleFarming(value)}
              className={cn(
                "flex w-full text-left transition-all transform cursor-pointer text-sm md:hover:translate-x-1 md:hover:opacity-80",
                isOn
                  ? "font-medium translate-x-1"
                  : selectedCount > 0
                    ? "opacity-60"
                    : "",
              )}
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
