/** Shared types for GET /api/menu-search and admin wine search (`/admin/wine-search`). */

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
  /** Stable id for grouping (menu document). May be a UUID string. */
  slug: string;
  /** When set, links to starwinelist.com/wine-place/[slug]. */
  starwinelist_slug: string | null;
  name: string;
  extracted_at: string | null;
  match_count: number;
  cheapest_bottle: number | null;
  cheapest_glass: number | null;
  wines: MenuSearchWine[];
};

/** One menu / venue where a grouped wine appears. */
export type MenuSearchVenueRef = {
  document_id: string;
  venue_name: string;
  starwinelist_slug: string | null;
  extracted_at: string | null;
};

/** One logical wine (producer + name + vintage) aggregated across menus. */
export type MenuSearchGroupedWine = {
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  region: string | null;
  country: string | null;
  wine_type: string | null;
  currency: string | null;
  price_glass_min: number | null;
  price_glass_max: number | null;
  price_bottle_min: number | null;
  price_bottle_max: number | null;
  place_count: number;
  newest_menu_at: string | null;
  /** Trigram relevance (text search); omitted in some clients. */
  match_score?: number | null;
  venues: MenuSearchVenueRef[];
};

export type MenuSearchResponse = {
  query: string;
  city: string;
  total_matches: number;
  page: number;
  per_page: number;
  /** Legacy shape (flat rows grouped per document). Prefer grouped_wines. */
  venues: MenuSearchVenue[];
  grouped_wines: MenuSearchGroupedWine[];
  sort: string;
  sort_dir: "asc" | "desc";
  _fallback?: boolean;
  message?: string;
};
