"use client";

import { Product } from "@/lib/shopify/types";
import { usePathname } from "next/navigation";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";
import { shouldNavigateShopFilters } from "@/lib/shop/filter-navigation";
import {
  SHOP_FARMING_UI_FILTER_VALUES,
  countProductsByFarming,
  type ShopFarmingFilterValue,
  type ShopFarmingUiFilterValue,
} from "@/lib/shop/farming-filter";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
} from "./shop-filter-option";

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
  const pathname = usePathname() || "";
  const navigateFilters = shouldNavigateShopFilters(pathname);
  const [active, setActive] = useQueryState(
    "ffarming",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const counts = countProductsByFarming(products);
  const countsReady = products.length > 0;
  const activeUiFarming =
    activeFarming &&
    (SHOP_FARMING_UI_FILTER_VALUES as readonly string[]).includes(activeFarming)
      ? activeFarming
      : undefined;
  // Navigation mode: keep Organic/Biodynamic <a href>, hide empty categories.
  // Query mode: href is null, so keep the catalog options and toggle ?ffarming=.
  const options = SHOP_FARMING_UI_FILTER_VALUES.filter((value) => {
    if (!getFarmingHref) return (counts.get(value) ?? 0) > 0;
    const isOn = active.includes(value) || activeUiFarming === value;
    if (isOn) return true;
    if (getFarmingHref(value) != null) return true;
    return !navigateFilters;
  });

  if (options.length === 0) return null;

  const selectedValues = options.filter(
    (value) => active.includes(value) || activeUiFarming === value,
  );
  const selectedCount =
    active.length +
    (activeUiFarming && !active.includes(activeUiFarming) ? 1 : 0);

  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";
  const selectionSummary = isSheet
    ? selectedValues.map((value) => t(`product.farming.${value}`)).join(", ") ||
      undefined
    : undefined;

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
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
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
          const hitCount = counts.get(value) ?? 0;
          const unavailable =
            !navigateFilters &&
            href == null &&
            countsReady &&
            hitCount === 0 &&
            !isOn;
          const optionClassName = shopFilterOptionClassName(isOn, {
            density: isSheet ? "sheet" : "default",
          });

          if (unavailable) {
            return (
              <button
                key={value}
                type="button"
                disabled
                className={cn(
                  optionClassName,
                  "cursor-not-allowed opacity-40 md:hover:text-neutral-500",
                )}
                aria-disabled
                aria-label={t("shop.filterByFarming", { name: label })}
              >
                <ShopFilterOptionContent selected={false}>
                  {label} (0)
                </ShopFilterOptionContent>
              </button>
            );
          }

          if (href) {
            return (
              <a
                key={value}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  toggleFarming(value);
                }}
                className={optionClassName}
                aria-pressed={isOn}
                aria-label={t("shop.filterByFarming", { name: label })}
              >
                <ShopFilterOptionContent selected={isOn}>
                  {label}
                </ShopFilterOptionContent>
              </a>
            );
          }

          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleFarming(value)}
              className={optionClassName}
              aria-pressed={isOn}
              aria-label={t("shop.filterByFarming", { name: label })}
            >
              <ShopFilterOptionContent selected={isOn}>
                {label}
              </ShopFilterOptionContent>
            </button>
          );
        })}
      </div>
    </ShopFilterCollapsible>
  );
}
