// Store catalog constants - now maps to Crowdvine campaigns
export const storeCatalog = {
  ids: "crowdvine-campaigns",
  rootCategoryId: "all-wines", // Maps to all wines view
};

export const sortOptions = [
  { label: "Price-Low", value: "price-asc" },
  { label: "Price-High", value: "price-desc" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];

export const DEFAULT_PAGE_SIZE = 24;

export const DEFAULT_SORT_KEY = "RELEVANCE";
