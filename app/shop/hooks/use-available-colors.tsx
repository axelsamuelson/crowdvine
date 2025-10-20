"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Product } from "@/lib/shopify/types";
import { Color } from "@/components/ui/color-picker";
import { COLOR_MAP } from "@/lib/constants";
import { useEffect, useMemo } from "react";

// All wine colors - simple list
const allColors: (Color | [Color, Color])[] = [
  { name: "Red", value: COLOR_MAP["red"] },
  { name: "White", value: COLOR_MAP["white"] },
  { name: "Orange", value: COLOR_MAP["orange"] },
  { name: "Rose", value: COLOR_MAP["rose"] },
  // Blend colors with dual display
  [
    { name: "Red", value: COLOR_MAP["red"] },
    { name: "Orange", value: COLOR_MAP["orange"] },
  ],
  [
    { name: "Red", value: COLOR_MAP["red"] },
    { name: "White", value: COLOR_MAP["white"] },
  ],
  [
    { name: "Orange", value: COLOR_MAP["orange"] },
    { name: "White", value: COLOR_MAP["white"] },
  ],
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

  // Extract available colors from products
  const availableColorNames = useMemo(() => {
    const colorSet = new Set<string>();

    console.log(
      `🎨 Processing ${products.length} products for color filtering`,
    );

    products.forEach((product) => {
      const colorOption = product.options.find(
        (option) => option.name.toLowerCase() === "color",
      );

      if (colorOption) {
        colorOption.values.forEach((value: any) => {
          // Handle both formats
          let colorName: string;
          if (typeof value === "string") {
            colorName = value;
          } else if (value && typeof value === "object" && "name" in value) {
            colorName = value.name;
          } else {
            return;
          }

          console.log(`🔍 Product color value: "${colorName}"`);

          // Match against allColors (both single and dual colors)
          const matchingColor = allColors.find((c) => {
            if (Array.isArray(c)) {
              // Dual color - match exact string "Red & Orange" or "Red/Orange"
              const dualName1 = `${c[0].name} & ${c[1].name}`;
              const dualName2 = `${c[0].name}/${c[1].name}`;
              const matches =
                colorName === dualName1 || colorName === dualName2;
              if (matches)
                console.log(`✅ Matched blend: ${colorName} → ${dualName1}`);
              return matches;
            } else {
              // Single color - exact match
              const matches = c.name === colorName;
              if (matches) console.log(`✅ Matched single: ${colorName}`);
              return matches;
            }
          });

          if (matchingColor) {
            const displayName = Array.isArray(matchingColor)
              ? `${matchingColor[0].name}/${matchingColor[1].name}`
              : matchingColor.name;
            colorSet.add(displayName);
          } else {
            console.warn(`⚠️ No match found for color: "${colorName}"`);
          }
        });
      }
    });

    console.log(`✨ Available colors:`, Array.from(colorSet));
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

  const selectedColors = availableColors.filter((c) => {
    const colorName = getColorName(c);
    return color.includes(colorName);
  });

  return {
    availableColors,
    selectedColors,
    toggleColor,
    activeColorFilters: color,
  };
}
