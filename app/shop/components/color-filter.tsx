"use client";

import { ColorPicker } from "@/components/ui/color-picker";
import { ColorSwatchSkeleton } from "@/components/ui/color-swatch-skeleton";
import { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";
import { useAvailableColors } from "../hooks/use-available-colors";
import { useColorFilterCount } from "../hooks/use-filter-count";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { formatWineColorDisplay } from "@/lib/i18n/wine-color-labels";

interface ColorFilterProps {
  products?: Product[];
  className?: string;
}

export function ColorFilter({ products = [], className }: ColorFilterProps) {
  const { t } = useTranslations();
  const { availableColors, selectedColors, toggleColor } =
    useAvailableColors(products);
  const colorCount = useColorFilterCount();
  const [isClient, setIsClient] = useState(false);

  // Ensure animations only run on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isLoading = products.length === 0;
  const atLeastOneColor = availableColors.length > 0;

  // Don't render motion components during SSR
  if (!isClient) {
    return (
      <div className={cn("px-2.5 py-2 rounded-md bg-muted", className)}>
        <h3 className="mb-2 font-semibold text-sm">
          {t("shop.color")}{" "}
          {colorCount > 0 && (
            <span className="text-foreground/50">({colorCount})</span>
          )}
        </h3>
        <ColorSwatchSkeleton count={4} />
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {(atLeastOneColor || isLoading) && (
        <motion.div
          layoutId="color-filter"
          layout="size"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("px-2.5 py-2 rounded-md bg-muted", className)}
        >
          <h3 className="mb-2 font-semibold text-sm">
            {t("shop.color")}{" "}
            {colorCount > 0 && (
              <span className="text-foreground/50">({colorCount})</span>
            )}
          </h3>
          {isLoading ? (
            <ColorSwatchSkeleton count={4} />
          ) : (
            <ColorPicker
              colors={availableColors}
              selectedColors={selectedColors}
              onColorChange={toggleColor}
              formatDisplayName={(c) => formatWineColorDisplay(t, c)}
              selectColorAria={(name) =>
                t("shop.selectColorAria", { name })
              }
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
