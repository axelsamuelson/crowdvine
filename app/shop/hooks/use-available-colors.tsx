"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Product } from "@/lib/shopify/types";
import { Color } from "@/components/ui/color-picker";
import { COLOR_MAP } from "@/lib/constants";
import { useEffect, useMemo } from "react";

const allColors: (Color | [Color, Color])[] = [
  // Wine colors
  { name: "Red", value: COLOR_MAP["red"] },
  { name: "Rose", value: COLOR_MAP["rose"] },
  { name: "White", value: COLOR_MAP["white"] },
  { name: "Orange", value: COLOR_MAP["orange"] },
  { name: "Purple", value: COLOR_MAP["purple"] },
  { name: "Pink", value: COLOR_MAP["pink"] },
  { name: "Blend", value: COLOR_MAP["blend"] },
  
  // Blend variations with dual colors
  [
    { name: "Red", value: COLOR_MAP["red"] },
    { name: "Orange", value: COLOR_MAP["orange"] }
  ],
  [
    { name: "Red", value: COLOR_MAP["red"] },
    { name: "Purple", value: COLOR_MAP["purple"] }
  ],
  [
    { name: "Orange", value: COLOR_MAP["orange"] },
    { name: "White", value: COLOR_MAP["white"] }
  ],

  // Wine variations
  { name: "Amber", value: COLOR_MAP["amber"] },
  { name: "Golden", value: COLOR_MAP["golden"] },
  { name: "Straw", value: COLOR_MAP["straw"] },
  { name: "Champagne", value: COLOR_MAP["champagne"] },
  { name: "Blush", value: COLOR_MAP["blush"] },
  { name: "Light Red", value: COLOR_MAP["light-red"] },
  { name: "Dark Red", value: COLOR_MAP["dark-red"] },
  { name: "Light Purple", value: COLOR_MAP["light-purple"] },
  { name: "Dark Purple", value: COLOR_MAP["dark-purple"] },

  // Barrel and bottle colors
  { name: "Brown", value: COLOR_MAP["brown"] },
  { name: "Dark Brown", value: COLOR_MAP["dark-brown"] },
  { name: "Light Brown", value: COLOR_MAP["light-brown"] },
  { name: "Tan", value: COLOR_MAP["tan"] },
  { name: "Beige", value: COLOR_MAP["beige"] },
  { name: "Wood", value: COLOR_MAP["wood"] },

  // Natural colors
  { name: "Green", value: COLOR_MAP["green"] },
  { name: "Olive", value: COLOR_MAP["olive"] },
  { name: "Sage", value: COLOR_MAP["sage"] },
  { name: "Emerald", value: COLOR_MAP["emerald"] },

  // Metallic colors
  { name: "Gold", value: COLOR_MAP["gold"] },
  { name: "Silver", value: COLOR_MAP["silver"] },
  { name: "Copper", value: COLOR_MAP["copper"] },

  // Neutral colors
  { name: "Black", value: COLOR_MAP["black"] },
  { name: "Gray", value: COLOR_MAP["gray"] },
  { name: "Dark Gray", value: COLOR_MAP["dark-gray"] },
  { name: "Light Gray", value: COLOR_MAP["light-gray"] },
  { name: "Cream", value: COLOR_MAP["cream"] },
  { name: "Ivory", value: COLOR_MAP["ivory"] },

  // Additional wine-related colors
  { name: "Coral", value: COLOR_MAP["coral"] },
  { name: "Salmon", value: COLOR_MAP["salmon"] },
  { name: "Plum", value: COLOR_MAP["plum"] },
  { name: "Crimson", value: COLOR_MAP["crimson"] },
  { name: "Lavender", value: COLOR_MAP["lavender"] },
  { name: "Peach", value: COLOR_MAP["peach"] },
  { name: "Sand", value: COLOR_MAP["sand"] },
  { name: "Khaki", value: COLOR_MAP["khaki"] },

  // Traditional colors (keeping for compatibility)
  { name: "Blue", value: COLOR_MAP["blue"] },
  { name: "Yellow", value: COLOR_MAP["yellow"] },
  { name: "Navy", value: COLOR_MAP["navy"] },
  { name: "Turquoise", value: COLOR_MAP["turquoise"] },
  { name: "Mint", value: COLOR_MAP["mint"] },
  { name: "Pistachio", value: COLOR_MAP["pistachio"] },
  { name: "Army Green", value: COLOR_MAP["army-green"] },
  { name: "Navy Blue", value: COLOR_MAP["navy-blue"] },
];

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

  // Extract available colors from products using memoization
  const availableColorNames = useMemo(() => {
    const colorSet = new Set<string>();

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

          // Find matching color (single or dual)
          const matchingColor = allColors.find((c) => {
            if (Array.isArray(c)) {
              // Dual color - match if product color matches the combined name
              const dualName = `${c[0].name.toLowerCase()} & ${c[1].name.toLowerCase()}`;
              const dualNameAlt = `${c[0].name.toLowerCase()}/${c[1].name.toLowerCase()}`;
              return colorName === dualName || colorName === dualNameAlt || colorName.includes(c[0].name.toLowerCase()) && colorName.includes(c[1].name.toLowerCase());
            } else {
              // Single color
              return c.name.toLowerCase() === colorName;
            }
          });
          
          if (matchingColor) {
            const displayName = Array.isArray(matchingColor) 
              ? `${matchingColor[0].name}/${matchingColor[1].name}`
              : matchingColor.name;
            colorSet.add(displayName);
          }
        });
      }
    });

    return colorSet;
  }, [products]);

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
