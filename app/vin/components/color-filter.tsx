"use client";

import { ColorPicker, type Color } from "@/components/ui/color-picker";
import { ColorSwatchSkeleton } from "@/components/ui/color-swatch-skeleton";
import { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";
import { useAvailableColors } from "../hooks/use-available-colors";
import { useColorFilterCount } from "../hooks/use-filter-count";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { formatWineColorDisplay } from "@/lib/i18n/wine-color-labels";

interface ColorFilterProps {
  products?: Product[];
  className?: string;
  onColorSelect?: (colorName: string) => void;
  showAllColors?: boolean;
  activeColor?: string;
  /** Clean category URL for each color when shop filter navigation applies. */
  getColorHref?: (colorName: string) => string | null;
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
}: ColorFilterProps) {
  const { t } = useTranslations();
  const { availableColors, selectedColors, toggleColor } =
    useAvailableColors(products, showAllColors, activeColor);
  const colorCount = useColorFilterCount();

  const isLoading = products.length === 0;
  const atLeastOneColor = availableColors.length > 0;

  const handleColorChange = (colorInput: Color | [Color, Color]) => {
    const colorName = getColorName(colorInput);
    if (onColorSelect) {
      const handled = onColorSelect(colorName);
      if (handled !== false) return;
    }
    toggleColor(colorInput);
  };

  return (
    <AnimatePresence initial={false}>
      {(atLeastOneColor || isLoading) && (
        <motion.div
          layoutId="color-filter"
          layout="size"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("px-2.5 py-2 rounded-md bg-muted", className)}
        >
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold">
              {t("shop.color")}{" "}
              {colorCount > 0 && (
                <span className="text-foreground/50">({colorCount})</span>
              )}
            </h3>
          </div>
          {isLoading ? (
            <ColorSwatchSkeleton count={4} />
          ) : (
            <ColorPicker
              colors={availableColors}
              selectedColors={selectedColors}
              onColorChange={handleColorChange}
              formatDisplayName={(c) => formatWineColorDisplay(t, c)}
              selectColorAria={(name) =>
                t("shop.selectColorAria", { name })
              }
              getColorHref={
                getColorHref
                  ? (color) => getColorHref(getColorName(color))
                  : undefined
              }
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
