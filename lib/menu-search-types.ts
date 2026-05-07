/** Shared types for GET /api/menu-search and the wine-search page. */

export type MenuSearchWine = {
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  wine_type: string | null;
  price_bottle: number | null;
  price_glass: number | null;
  currency: string | null;
};

export type MenuSearchVenue = {
  slug: string;
  name: string;
  extracted_at: string | null;
  match_count: number;
  cheapest_bottle: number | null;
  cheapest_glass: number | null;
  wines: MenuSearchWine[];
};

export type MenuSearchResponse = {
  query: string;
  city: string;
  total_matches: number;
  page: number;
  per_page: number;
  venues: MenuSearchVenue[];
  _fallback?: boolean;
  message?: string;
};
