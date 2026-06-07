const SORT_KEYS: Record<string, string> = {
  "most-popular": "shop.sortMostPopular",
  "price-asc": "shop.sortPriceLow",
  "price-desc": "shop.sortPriceHigh",
  newest: "shop.sortNewest",
  oldest: "shop.sortOldest",
  "in-stock": "shop.sortInStock",
  "out-of-stock": "shop.sortOutOfStock",
};

export function sortOptionMessageKey(value: string): string {
  return SORT_KEYS[value] ?? value;
}
