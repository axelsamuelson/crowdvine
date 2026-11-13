import type { Product } from "@/lib/shopify/types";
import {
  WINE_CHARACTER_FILTER_VALUES,
  characterValuesForTasteTags,
  isWineCharacterFilterValue,
  productMatchesCharacterValues,
  type WineCharacterFilterValue,
} from "@/lib/wine-character-tags";

/**
 * Multi-select OR filter: keep wines whose taste_tags match ANY selected
 * character value (and ANY of that value's database tags).
 */
export function filterProductsByCharacter(
  products: Product[],
  characterValues: string[],
): Product[] {
  if (!characterValues?.length) return products;
  const wanted = characterValues.filter(
    (value): value is WineCharacterFilterValue =>
      isWineCharacterFilterValue(value),
  );
  if (wanted.length === 0) return products;

  return products.filter((product) =>
    productMatchesCharacterValues(product.taste_tags, wanted),
  );
}

export function countProductsByCharacter(
  products: Product[],
): Map<WineCharacterFilterValue, number> {
  const counts = new Map<WineCharacterFilterValue, number>(
    WINE_CHARACTER_FILTER_VALUES.map((value) => [value, 0]),
  );
  for (const product of products) {
    for (const value of characterValuesForTasteTags(product.taste_tags)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}
