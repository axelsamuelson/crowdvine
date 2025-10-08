"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Product } from "@/lib/shopify/types";
import { Color } from "@/components/ui/color-picker";
import { COLOR_MAP } from "@/lib/constants";
import { useEffect, useMemo } from "react";

// Main wine colors - only colors actually used for wine
const baseWineColors: Color[] = [
  { name: "Red", value: COLOR_MAP["red"] },
  { name: "White", value: COLOR_MAP["white"] },
  { name: "Orange", value: COLOR_MAP["orange"] },
  { name: "Rose", value: COLOR_MAP["rose"] },
];

// Dynamic allColors array that will be populated from products
let allColors: (Color | [Color, Color])[] = [...baseWineColors];

const getColorName = (color: Color | [Color, Color]) => {
  if (Array.isArray(color)) {
    const [color1, color2] = color;
    return `${color1.name}/${color2.name}`;
  }
  return color.name;
};

export function useAvailableColors(products: Product[]) {
  const [color, setColor] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Extract available colors from products and create blend options dynamically
  const { availableColorNames, dynamicBlendColors } = useMemo(() => {
    const colorSet = new Set<string>();
    const blendsToAdd: [Color, Color][] = [];

    products.forEach((product) => {
      const colorOption = product.options.find(
        (option) => option.name.toLowerCase() === "color",
      );

      if (colorOption) {
        colorOption.values.forEach((value: any) => {
          // Handle both formats: SFCC reshaped format {id, name} and raw Shopify format (string)
          let colorName: string;
          if (typeof value === "string") {
            // Raw Shopify format
            colorName = value.toLowerCase();
          } else if (
            value &&
            typeof value === "object" &&
            "name" in value &&
            typeof value.name === "string"
          ) {
            // SFCC reshaped format
            colorName = value.name.toLowerCase();
          } else {
            return; // Skip invalid values
          }

          // Check if it's a blend color (contains & or /)
          if (colorName.includes(' & ') || colorName.includes('/')) {
            // Parse blend: "Red & Orange" or "Red/Orange"
            const parts = colorName.split(/\s*[&/]\s*/);
            if (parts.length === 2) {
              const color1 = baseWineColors.find(c => c.name.toLowerCase() === parts[0].trim());
              const color2 = baseWineColors.find(c => c.name.toLowerCase() === parts[1].trim());
              
              if (color1 && color2) {
                // Add blend to dynamic list
                const blendKey = `${color1.name}/${color2.name}`;
                colorSet.add(blendKey);
                
                // Check if blend already exists
                const blendExists = blendsToAdd.some(
                  b => b[0].name === color1.name && b[1].name === color2.name
                );
                if (!blendExists) {
                  blendsToAdd.push([color1, color2]);
                }
              }
            }
          } else {
            // Single color - match against base colors
            const matchingColor = baseWineColors.find(
              (c) => c.name.toLowerCase() === colorName
            );
            
            if (matchingColor) {
              colorSet.add(matchingColor.name);
            }
          }
        });
      }
    });

    return { availableColorNames: colorSet, dynamicBlendColors: blendsToAdd };
  }, [products]);

  // Update allColors with dynamic blends
  useEffect(() => {
    allColors = [...baseWineColors, ...dynamicBlendColors];
  }, [dynamicBlendColors]);

  // Filter to only show available colors
  const availableColors = allColors.filter((c) => {
    const name = Array.isArray(c) ? `${c[0].name}/${c[1].name}` : c.name;
    return availableColorNames.has(name);
  });

  // Auto-remove unavailable color filters
  useEffect(() => {
    if (color.length > 0) {
      const validColors = color.filter((colorName) =>
        availableColorNames.has(colorName),
      );

      if (validColors.length !== color.length) {
        setColor(validColors);
      }
    }
  }, [products, color, setColor, availableColorNames]);

  const toggleColor = (colorInput: Color | [Color, Color]) => {
    const colorName = getColorName(colorInput);
    setColor(
      color.includes(colorName)
        ? color.filter((c) => c !== colorName)
        : [...color, colorName],
    );
  };

  const selectedColors = availableColors.filter((c) => color.includes(c.name));

  return {
    availableColors,
    selectedColors,
    toggleColor,
    activeColorFilters: color,
  };
}
