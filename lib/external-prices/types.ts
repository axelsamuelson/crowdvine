/**
 * Types for competitor price + PDP tracking.
 * Wine shape used by adapters/matching: minimal fields from our DB.
 */

export interface WineForMatch {
  id: string;
  wine_name: string;
  vintage: string;
  producer?: { name: string } | null;
  grape_varieties?: string | null;
  color?: string | null;
}

export interface PriceSource {
  id: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  slug: string;
  base_url: string;
  search_url_template?: string | null;
  sitemap_url?: string | null;
  adapter_type: string;
  is_active: boolean;
  rate_limit_delay_ms: number;
  last_crawled_at?: string | null;
  config?: Record<string, unknown>;
}

export interface ExternalOffer {
  id: string;
  created_at?: string;
  updated_at?: string;
  wine_id: string;
  price_source_id: string;
  pdp_url: string;
  price_amount: number | null;
  currency: string;
  available: boolean;
  title_raw: string | null;
  match_confidence: number;
  last_fetched_at: string;
}

/** Normalized offer extracted from a PDP (by an adapter). */
export interface NormalizedOffer {
  priceAmount: number | null;
  currency: string;
  available: boolean;
  titleRaw: string;
  pdpUrl: string;
  /** Producer/vendor from store (e.g. Shopify product.vendor). */
  vendor?: string | null;
  /** Bottle size if derivable (e.g. 750ml, 1500ml). */
  size?: string | null;
}

