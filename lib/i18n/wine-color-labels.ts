import type { Color } from "@/components/ui/color-picker";

const WINE_COLOR_KEYS: Record<string, string> = {
  Red: "shop.wineColorRed",
  White: "shop.wineColorWhite",
  Orange: "shop.wineColorOrange",
  Rose: "shop.wineColorRose",
  Sparkling: "shop.wineColorSparkling",
};

const WINE_COLOR_KEYS_BY_SLUG: Record<string, string> = {
  red: "shop.wineColorRed",
  white: "shop.wineColorWhite",
  orange: "shop.wineColorOrange",
  rose: "shop.wineColorRose",
  rosé: "shop.wineColorRose",
  sparkling: "shop.wineColorSparkling",
  mousserande: "shop.wineColorSparkling",
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

/** Translate a free-form wine color string (e.g. profile "white") with PLP keys. */
export function formatWineColorLabel(
  t: (key: string) => string,
  raw: string | null | undefined,
): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  const key =
    WINE_COLOR_KEYS[value] ||
    WINE_COLOR_KEYS_BY_SLUG[value.toLowerCase()] ||
    null;
  return key ? t(key) : value;
}
