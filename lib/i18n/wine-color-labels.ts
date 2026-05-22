import type { Color } from "@/components/ui/color-picker";

const WINE_COLOR_KEYS: Record<string, string> = {
  Red: "shop.wineColorRed",
  White: "shop.wineColorWhite",
  Orange: "shop.wineColorOrange",
  Rose: "shop.wineColorRose",
};

/** Localized label for shop color filter swatches (internal names stay English for filtering). */
export function formatWineColorDisplay(
  t: (key: string) => string,
  color: Color | [Color, Color],
): string {
  if (Array.isArray(color)) {
    return `${formatWineColorDisplay(t, color[0])} & ${formatWineColorDisplay(t, color[1])}`;
  }
  const key = WINE_COLOR_KEYS[color.name];
  return key ? t(key) : color.name;
}
