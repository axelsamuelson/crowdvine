"use client";

import { ColorPicker, type Color } from "@/components/ui/color-picker";
import { ColorSwatchSkeleton } from "@/components/ui/color-swatch-skeleton";
import { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";
import { useAvailableColors } from "../hooks/use-available-colors";
import { useColorFilterCount } from "../hooks/use-filter-count";
import {
  shouldNavigateShopFilters,
  localeFromShopPathname,
  resolveShopFilterNavigationUrl,
} from "@/lib/shop/filter-navigation";
import { gateShopFilterHref } from "@/lib/shop/gate-shop-filter-href";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/lib/hooks/use-translations";
import { formatWineColorDisplay } from "@/lib/i18n/wine-color-labels";

interface ColorFilterProps {
  products?: Product[];
  className?: string;
  onColorSelect?: (colorName: string) => boolean | void;
  showAllColors?: boolean;
  activeColor?: string;
  /** Clean category URL for each color when shop filter navigation applies. */
  getColorHref?: (colorName: string) => string | null;
  /** Category paths that have catalog wines. Query mode uses this, not the fixed color list. */
  navigableShopPaths?: readonly string[];
  /** Request path. Parents pass the SSR fallback so /wine stays in navigation mode. */
  pathname?: string;
  /** Mobile filter sheet only: labels under swatches. */
  showSwatchLabels?: boolean;
}

function catalogColorIsListed(
  colorName: string,
  locale: "sv" | "en",
  navigablePaths: readonly string[] | undefined,
): boolean {
  const url = resolveShopFilterNavigationUrl({
    locale,
    currentPath: locale === "en" ? "/wine" : "/vin",
    nextColorUi: colorName,
  });
  const path = url.split("?")[0] ?? url;
  if (path === "/wine" || path === "/vin") return false;
  return gateShopFilterHref(path, { isClear: false, navigablePaths }) != null;
}
function getColorName(color: Color | [Color, Color]) {
  if (Array.isArray(color)) {
    const [color1, color2] = color;
    return `${color1.name}/${color2.name}`;
  }
  return color.name;
}

export function ColorFilter({
  products = [],
  className,
  onColorSelect,
  showAllColors,
  activeColor,
  getColorHref,
  navigableShopPaths,
  pathname: pathnameProp,
  showSwatchLabels = false,
}: ColorFilterProps) {
  const { t } = useTranslations();
  const routerPathname = usePathname();
  const pathname = pathnameProp || routerPathname || "";
  const navigateFilters = shouldNavigateShopFilters(pathname);
  const locale = localeFromShopPathname(pathname);
  const { availableColors, selectedColors, toggleColor, colorCounts } =
    useAvailableColors(products, showAllColors, activeColor);
  const colorCount = useColorFilterCount();
  const countsReady = products.length > 0;

  // Category URL hrefs do not need the product list; show colors immediately
  // so server HTML includes <a href> for crawlable filter links.
  const colorsReady =
    Boolean(getColorHref) || showAllColors || products.length > 0;
  // Navigation mode: hide colors that would land on an empty category.
  // Query mode: same catalog colors as /wine (navigable category), not the fixed list.
  const displayColors =
    getColorHref && navigateFilters
      ? availableColors.filter((color) => {
          const name = getColorName(color);
          if (name === activeColor) return true;
          if (
            selectedColors.some((selected) => getColorName(selected) === name)
          ) {
            return true;
          }
          return getColorHref(name) != null;
        })
      : navigateFilters
        ? availableColors
        : availableColors.filter((color) => {
            const name = getColorName(color);
            if (name === activeColor) return true;
            if (
              selectedColors.some((selected) => getColorName(selected) === name)
            ) {
              return true;
            }
            return catalogColorIsListed(name, locale, navigableShopPaths);
          });
  const atLeastOneColor = displayColors.length > 0;

  const isColorSelected = (color: Color | [Color, Color]) => {
    const name = getColorName(color);
    return selectedColors.some((selected) => getColorName(selected) === name);
  };

  const colorHitCount = (color: Color | [Color, Color]) =>
    colorCounts.get(getColorName(color)) ?? 0;

  const queryColorState = (color: Color | [Color, Color]) => {
    if (navigateFilters) return undefined;
    const empty =
      countsReady && colorHitCount(color) === 0 && !isColorSelected(color);
    if (!empty) return undefined;
    return { disabled: true, annotation: "(0)" };
  };

  const handleColorChange = (colorInput: Color | [Color, Color]) => {
    if (queryColorState(colorInput)?.disabled) return;
    const colorName = getColorName(colorInput);
    if (onColorSelect) {
      const handled = onColorSelect(colorName);
      if (handled !== false) return;
    }
    toggleColor(colorInput);
  };

  if (!(atLeastOneColor || !colorsReady)) return null;

  // Mobile filter sheet: static block so gap-2 spacing matches other groups
  // (layout animations leave uneven empty space above Region).
  if (showSwatchLabels) {
    const colorSummary = selectedColors
      .map((c) => formatWineColorDisplay(t, c))
      .join(", ");
    return (
      <div className={cn("rounded-md bg-muted px-2.5 py-2", className)}>
        <div className="mb-2 flex min-w-0 items-baseline gap-1.5">
          <h3 className="truncate text-sm font-semibold">{t("shop.color")}</h3>
          {colorSummary ? (
            <>
              <span
                aria-hidden
                className="shrink-0 text-sm font-normal text-foreground/50"
              >
                ·
              </span>
              <span className="min-w-0 truncate text-sm font-normal text-foreground/60">
                {colorSummary}
              </span>
            </>
          ) : null}
        </div>
        {!colorsReady ? (
          <ColorSwatchSkeleton count={4} />
        ) : (
          <ColorPicker
            colors={displayColors}
            selectedColors={selectedColors}
            onColorChange={handleColorChange}
            formatDisplayName={(c) => formatWineColorDisplay(t, c)}
            selectColorAria={(name) => t("shop.selectColorAria", { name })}
            getColorHref={
              navigateFilters && getColorHref
                ? (color) => getColorHref(getColorName(color))
                : undefined
            }
            getColorState={navigateFilters ? undefined : queryColorState}
            showLabels
          />
        )}
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        layoutId="color-filter"
        layout="size"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn("rounded-md bg-muted px-2.5 py-2", className)}
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {t("shop.color")}{" "}
            {colorCount > 0 && (
              <span className="text-foreground/50">({colorCount})</span>
            )}
          </h3>
        </div>
        {!colorsReady ? (
          <ColorSwatchSkeleton count={4} />
        ) : (
          <ColorPicker
            colors={displayColors}
            selectedColors={selectedColors}
            onColorChange={handleColorChange}
            formatDisplayName={(c) => formatWineColorDisplay(t, c)}
            selectColorAria={(name) => t("shop.selectColorAria", { name })}
            getColorHref={
              navigateFilters && getColorHref
                ? (color) => getColorHref(getColorName(color))
                : undefined
            }
            getColorState={navigateFilters ? undefined : queryColorState}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
