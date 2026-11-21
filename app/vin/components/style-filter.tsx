"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";
import {
  SHOP_STYLE_FILTER_VALUES,
  getActiveStyleFromPathname,
  styleFilterLabel,
  type ShopStyleFilterValue,
} from "@/lib/shop/style-category-links";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
} from "./shop-filter-option";

interface StyleFilterProps {
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
  onStyleSelect?: (style: ShopStyleFilterValue) => boolean | void;
  activeStyle?: ShopStyleFilterValue;
  /** Clean category URL for each style option (null when empty / not navigable). */
  getStyleHref?: (style: ShopStyleFilterValue) => string | null;
}

export function StyleFilter({
  className,
  mode = "sidebar",
  onSeeAll,
  onStyleSelect,
  activeStyle,
  getStyleHref,
}: StyleFilterProps) {
  const { t, context } = useTranslations();
  const pathname = usePathname() || "";
  const router = useRouter();
  const locale = context.locale === "en" ? "en" : "sv";
  const pathActive = getActiveStyleFromPathname(pathname);
  const activeUiStyle = activeStyle ?? pathActive ?? undefined;

  const options = SHOP_STYLE_FILTER_VALUES.filter((value) => {
    const isOn = activeUiStyle === value;
    if (isOn) return true;
    if (!getStyleHref) return false;
    return getStyleHref(value) != null;
  });

  if (options.length === 0) return null;

  const selectedCount = activeUiStyle ? 1 : 0;
  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";
  const selectionSummary = isSheet
    ? (activeUiStyle ? styleFilterLabel(activeUiStyle, locale) : undefined)
    : undefined;

  const toggleStyle = (value: ShopStyleFilterValue) => {
    if (onStyleSelect) {
      const handled = onStyleSelect(value);
      if (handled !== false) return;
    }
    const href = getStyleHref?.(value);
    if (href) router.push(href);
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
      title={t("shop.style")}
      count={selectedCount}
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
      collapsible={collapsible}
      forceMountContent={Boolean(getStyleHref)}
      headerAction={seeAllButton}
      className={className}
    >
      <div className="flex flex-col gap-0.5">
        {options.map((value) => {
          const isOn = activeUiStyle === value;
          const label = styleFilterLabel(value, locale);
          const href = getStyleHref?.(value) ?? null;
          const optionClassName = shopFilterOptionClassName(isOn, {
            density: isSheet ? "sheet" : "default",
          });

          if (href) {
            return (
              <a
                key={value}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  toggleStyle(value);
                }}
                className={optionClassName}
                aria-pressed={isOn}
                aria-label={t("shop.filterByStyle", { name: label })}
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
              onClick={() => toggleStyle(value)}
              className={cn(optionClassName)}
              aria-pressed={isOn}
              aria-label={t("shop.filterByStyle", { name: label })}
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
