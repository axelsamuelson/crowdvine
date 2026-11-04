"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { usePathname } from "next/navigation";
import { Product } from "@/lib/shopify/types";
import { Color } from "@/components/ui/color-picker";
import { COLOR_MAP } from "@/lib/constants";
import { shouldNavigateShopFilters } from "@/lib/shop/filter-navigation";
import { useEffect, useMemo } from "react";

// All wine colors - simple list
const allColors: (Color | [Color, Color])[] = [
  { name: "Red", value: COLOR_MAP["red"] },
  { name: "White", value: COLOR_MAP["white"] },
  { name: "Orange", value: COLOR_MAP["orange"] },
  // Blend colors with dual display
  [
    { name: "Red", value: COLOR_MAP["red"] },
    { name: "Orange", value: COLOR_MAP["orange"] },
  ],
  [
    { name: "Red", value: COLOR_MAP["red"] },
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

function colorValueName(
  value: string | { name?: unknown },
): string | undefined {
  if (typeof value === "string") return value;
  return typeof value.name === "string" ? value.name : undefined;
}

function matchCatalogColorName(colorName: string): string | undefined {
  const normalized = colorName
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " & ")
    .replace(/\s+/g, " ");

  const matchingColor = allColors.find((c) => {
    if (Array.isArray(c)) {
      const dualName1 = `${c[0].name} & ${c[1].name}`.toLowerCase();
      const dualName2 = `${c[0].name}/${c[1].name}`
        .toLowerCase()
        .replace("/", " & ");
      const matches = normalized === dualName1 || normalized === dualName2;
      if (matches) console.log(`✅ Matched blend: ${colorName} → ${dualName1}`);
      return matches;
    }
    const matches = c.name.toLowerCase() === normalized;
    if (matches) console.log(`✅ Matched single: ${colorName}`);
    return matches;
  });

  if (!matchingColor) return undefined;
  return getColorName(matchingColor);
}

export function useAvailableColors(
  products: Product[],
  showAllColors?: boolean,
  activeColorName?: string,
) {
  const pathname = usePathname() || "";
  const inNavigationMode = shouldNavigateShopFilters(pathname);
  const [color, setColor] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Extract available colors from products and count hits per catalog color.
  const { availableColorNames, colorCounts } = useMemo(() => {
    const colorSet = new Set<string>();
    const counts = new Map<string, number>();
    for (const entry of allColors) {
      counts.set(getColorName(entry), 0);
    }

    console.log(
      `🎨 Processing ${products.length} products for color filtering`,
    );

    products.forEach((product) => {
      const colorOption = product.options.find(
        (option) => option.name.toLowerCase() === "color",
      );

      if (colorOption) {
        colorOption.values.forEach((value) => {
          const colorName = colorValueName(value);
          if (!colorName) return;

          console.log(`🔍 Product color value: "${colorName}"`);

          const displayName = matchCatalogColorName(colorName);
          if (displayName) {
            colorSet.add(displayName);
            counts.set(displayName, (counts.get(displayName) ?? 0) + 1);
          } else {
            console.warn(`⚠️ No match found for color: "${colorName}"`);
          }
        });
      }
    });

    console.log(`✨ Available colors:`, Array.from(colorSet));
    return { availableColorNames: colorSet, colorCounts: counts };
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

  // Navigation (/wine, colour/farming categories) keeps the previous list.
  // Query mode (producer pages) always offers the catalog color set; hits are
  // counted separately so empty colors can stay visible.
  const panelColors =
    !inNavigationMode || showAllColors ? allColors : availableColors;

  const selectedColors = panelColors.filter((c) => {
    const colorName = getColorName(c);
    return color.includes(colorName) || colorName === activeColorName;
  });

  return {
    availableColors: panelColors,
    selectedColors,
    toggleColor,
    activeColorFilters: color,
    colorCounts,
  };
}
