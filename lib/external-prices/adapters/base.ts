/**
 * Base adapter interface for competitor price sources.
 * Implementations: Shopify-like, WooCommerce, custom.
 */

import type { NormalizedOffer, PriceSource, WineForMatch } from "../types";

export interface SourceAdapter {
  /** Return candidate PDP URLs for this wine. */
  searchCandidates(wine: WineForMatch, source: PriceSource): Promise<string[]>;
  /** Fetch one PDP and return normalized offer, or null on failure. */
  fetchOffer(pdpUrl: string, source: PriceSource): Promise<NormalizedOffer | null>;
}
