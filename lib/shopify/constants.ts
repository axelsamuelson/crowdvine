// Store catalog constants - now maps to Crowdvine campaigns
export const storeCatalog = {
  ids: "crowdvine-campaigns",
  rootCategoryId: "all-wines", // Maps to all wines view
};

export const sortOptions = [
  { label: "Most-Popular", value: "most-popular" },
  { label: "Price-Low", value: "price-asc" },
  { label: "Price-High", value: "price-desc" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];

/** Stock sort options - only shown on B2B (business) shop */
export const stockSortOptions = [
  { label: "In stock", value: "in-stock" },
  { label: "Out of stock", value: "out-of-stock" },
];

/** Default PLP sort when `?sort=` is absent (B2C pactwines.com). */
export const DEFAULT_B2C_SHOP_SORT = "most-popular";

/** Default PLP sort when `?sort=` is absent (B2B dirtywine.se). */
export const DEFAULT_B2B_SHOP_SORT = "in-stock";

export const DEFAULT_SORT_KEY = "RELEVANCE";
