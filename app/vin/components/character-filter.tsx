"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useMemo } from "react";

import { useProducts } from "@/components/shop/products-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import { countProductsByCharacter } from "@/lib/shop/filter-products-by-character";
import {
  localeFromShopPathname,
  resolveCharacterFilterNavigationUrl,
  selectedWineCharacterValues,
  shouldNavigateShopFilters,
} from "@/lib/shop/filter-navigation";
import {
  WINE_CHARACTER_FILTERS,
  WINE_CHARACTER_PATH_VALUE,
  wineCharacterLabel,
  type WineCharacterFilterValue,
} from "@/lib/wine-character-tags";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
  shopFilterSheetListClassName,
} from "./shop-filter-option";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

type CharacterFilterMode = "sidebar" | "drawer" | "overlay";

interface CharacterFilterProps {
  className?: string;
  mode?: CharacterFilterMode;
  onSeeAll?: () => void;
  /** Clean category / query URL for each character value. */
  getCharacterHref?: (value: WineCharacterFilterValue) => string | null;
}

export function CharacterFilter({
  className,
  mode = "sidebar",
  onSeeAll,
  getCharacterHref,
}: CharacterFilterProps) {
  const { t, context } = useTranslations();
  const locale = context.locale === "en" ? "en" : "sv";
  const { originalProducts } = useProducts();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const navigateFilters = shouldNavigateShopFilters(pathname);
  const [active, setActive] = useQueryState(
    "character",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const selectedValues = selectedWineCharacterValues(pathname, active);

  const counts = useMemo(
    () => countProductsByCharacter(originalProducts),
    [originalProducts],
  );
  const countsReady = originalProducts.length > 0;

  const options = useMemo(() => {
    return WINE_CHARACTER_FILTERS.filter((def) => {
      const isOn = selectedValues.includes(def.value);
      if (isOn) return true;
      if (countsReady) return (counts.get(def.value) ?? 0) > 0;
      // Before products hydrate, keep the indexable light_easy path crawlable.
      return (
        def.value === WINE_CHARACTER_PATH_VALUE &&
        getCharacterHref?.(def.value) != null
      );
    });
  }, [counts, countsReady, getCharacterHref, selectedValues]);

  if (options.length === 0) return null;

  const selectedDefs = options.filter((def) =>
    selectedValues.includes(def.value),
  );
  const selectedCount = selectedDefs.length;

  const toggleCharacter = (value: WineCharacterFilterValue) => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    const shopLocale = localeFromShopPathname(pathname);
    if (shouldNavigateShopFilters(pathname)) {
      router.push(
        resolveCharacterFilterNavigationUrl({
          locale: shopLocale,
          currentPath: pathname,
          search: searchParams.toString(),
          nextValues: next,
        }),
      );
      return;
    }
    void setActive(next.length ? next : null);
  };

  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";
  const selectionSummary = isSheet
    ? selectedDefs.map((def) => wineCharacterLabel(def.value, locale)).join(", ") ||
      undefined
    : undefined;
  const seeAllButton =
    mode === "sidebar" && onSeeAll ? (
      <button
        type="button"
        onClick={onSeeAll}
        className="text-xs font-medium text-foreground/60 transition-colors hover:text-foreground/80"
        aria-label={t("shop.seeAllFilters")}
      >
        {t("shop.seeAll")}
      </button>
    ) : null;

  return (
    <ShopFilterCollapsible
      title={t("shop.character")}
      count={selectedCount}
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
      collapsible={collapsible}
      forceMountContent={Boolean(getCharacterHref)}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={isSheet ? shopFilterSheetListClassName() : undefined}>
        <div className="flex flex-col gap-0.5">
          {options.map((def) => {
            const isOn = selectedValues.includes(def.value);
            const label = wineCharacterLabel(def.value, locale);
            const href = getCharacterHref?.(def.value) ?? null;
            const hitCount = counts.get(def.value) ?? 0;
            const optionClassName = shopFilterOptionClassName(isOn, {
              density: isSheet ? "sheet" : "default",
            });

            if (
              !navigateFilters &&
              href == null &&
              countsReady &&
              hitCount === 0 &&
              !isOn
            ) {
              return null;
            }

            if (href) {
              return (
                <a
                  key={def.value}
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    toggleCharacter(def.value);
                  }}
                  className={optionClassName}
                  aria-pressed={isOn}
                  aria-label={t("shop.filterByCharacter", { name: label })}
                >
                  <ShopFilterOptionContent selected={isOn}>
                    {label}
                  </ShopFilterOptionContent>
                </a>
              );
            }

            return (
              <button
                key={def.value}
                type="button"
                onClick={() => toggleCharacter(def.value)}
                className={optionClassName}
                aria-pressed={isOn}
                aria-label={t("shop.filterByCharacter", { name: label })}
              >
                <ShopFilterOptionContent selected={isOn}>
                  {label}
                </ShopFilterOptionContent>
              </button>
            );
          })}
        </div>
      </div>
    </ShopFilterCollapsible>
  );
}
