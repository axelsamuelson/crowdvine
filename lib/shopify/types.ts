export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string;
  handle: string;
  productType: string; // For category-like filtering (available in tokenless)
  category?: {
    id: string;
    name: string;
  }; // Shopify's Standard Product Taxonomy category
  options: Array<{
    id: string;
    name: string;
    values: string[];
  }>; // Direct product options (Color, Size, etc.)
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string;
        thumbhash?: string;
      };
    }>;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  compareAtPriceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        availableForSale: boolean;
        selectedOptions?: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  image?: {
    url: string;
    altText: string;
  };
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: {
      amount: string;
      currencyCode: string;
    };
    selectedOptions: {
      name: string;
      value: string;
    }[];
    product: {
      title: string;
      handle: string;
      images: {
        edges: Array<{
          node: {
            url: string;
            altText: string;
            thumbhash?: string;
          };
        }>;
      };
    };
  };
}

export interface ShopifyCart {
  id: string;
  lines: {
    edges: Array<{ node: ShopifyCartLine }>;
  };
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalTaxAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  checkoutUrl: string;
}

// Clean types for the new Shopify-only structure
/** Wine enrichment fields for PDP (from public.wines). */
export type WineEnrichment = {
  tasting_notes?: string | null;
  appellation?: string | null;
  farming?: string | null;
  /** Free-text additives note (tillsatser) shown with farming on PDP. */
  additives?: string | null;
  serving_temp_c?: string | null;
  /** Alcohol by volume (e.g. "13.5" or "13.5%"). */
  abv?: string | null;
  /** Numeric ABV from admin (fallback when abv text is empty). */
  alcohol_percentage?: number | null;
  food_pairing?: string[] | null;
  soil_type?: string | null;
  elevation_masl?: number | null;
  ageing?: string | null;
  winemaker_notes?: string | null;
  awards?: string[] | null;
  grapeVarieties?: string[] | null;
  /** Wine color (e.g. Red, White) for Om vinet specs. */
  color?: string | null;
  /** Style scale 1–5. 1 = rent/clean, 5 = livfullt/alive. */
  style_scale?: number | null;
  /** Taste/character tags from wines.tags (passed via enrichment on PDP). */
  taste_tags?: string[];
};

export type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  seo: SEO;
  parentCategoryTree: {
    id: string;
    name: string;
  }[];
  updatedAt: string;
  path: string;
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  categoryId?: string;
  producerId?: string;
  description: string;
  descriptionHtml: string;
  /** Short summary for PDP white box (wines). */
  summary?: string | null;
  /** Wine specs for bullet list under description (e.g. Region, Appellation, Terroir, Vinification, ABV). */
  specs?: Record<string, string> | null;
  /** Enrichment fields for PDP sections (tasting notes, farming, food pairing, etc.). */
  wineEnrichment?: WineEnrichment | null;
  /** Taste/character tags from wines.tags (DB), separate from synthetic product.tags. */
  taste_tags?: string[];
  featuredImage: Image;
  currencyCode: string;
  priceRange: {
    maxVariantPrice: Money;
    minVariantPrice: Money;
  };
  compareAtPrice?: Money;
  seo: SEO;
  options: ProductOption[];
  tags: string[];
  variants: ProductVariant[];
  images: Image[];
  availableForSale: boolean;
  producerName?: string;
  /** Producer coordinates for PDP map (from producers table). */
  producerLocation?: {
    lat?: number | null;
    lon?: number | null;
    subregion?: string | null;
    region?: string | null;
  } | null;
  /** When true, PACT Points redeem at higher SEK value against this wine's lines (see checkout). */
  producerBoostActive?: boolean;
  priceBreakdown?: {
    costAmount: number;
    exchangeRate: number;
    alcoholTaxCents: number;
    marginPercentage: number;
    /** List price in öre (SEK); used for breakdown — not display currency. */
    basePriceCents?: number;
    b2bMarginPercentage?: number;
    b2bShippingPerBottleSek?: number;
    b2bPriceExclVat?: number;
  };
  /** B2B price exkl moms when b2b_margin_percentage is set (from list API) */
  b2bPriceExclVat?: number;
  /** B2B stock quantity (wines). Null/0 = out of stock. Used for stock badges. */
  b2bStock?: number | null;
  /** Pre-discount list unit price (SEK) for crowdvine cart lines; used in checkout. */
  originalUnitPriceSek?: number;
  /** True when line has member discount, early-bird, etc. (crowdvine cart). */
  hasDiscount?: boolean;
};

export type ProductSortKey =
  | "RELEVANCE"
  | "BEST_SELLING"
  | "CREATED_AT"
  | "ID"
  | "PRICE"
  | "PRODUCT_TYPE"
  | "TITLE"
  | "UPDATED_AT"
  | "VENDOR";

export type ProductCollectionSortKey =
  | "BEST_SELLING"
  | "COLLECTION_DEFAULT"
  | "CREATED"
  | "ID"
  | "MANUAL"
  | "PRICE"
  | "RELEVANCE"
  | "TITLE";

export type SelectedOptions = {
  name: string;
  value: string;
}[];

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOptions;
  price: Money;
};

export type ProductOption = {
  id: string;
  name: string;
  values: {
    id: string;
    name: string;
  }[];
};

export type Money = {
  amount: string;
  currencyCode: string;
};

export type Image = {
  url: string;
  altText: string;
  height: number;
  width: number;
  selectedOptions?: SelectedOptions;
  thumbhash?: string;
};

export type SEO = {
  title: string;
  description: string;
};

// Cart and checkout related types
export type Cart = {
  id: string;
  checkoutUrl: string;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money;
    shippingAmount?: Money;
  };
  totalQuantity: number;
  lines: CartItem[];
};

export type CartItem = {
  id: string;
  quantity: number;
  source?: "producer" | "warehouse"; // Source of the item (producer or warehouse)
  cost: {
    totalAmount: Money;
  };
  discountLabel?: string;
  merchandise: {
    id: string;
    title: string;
    selectedOptions: SelectedOptions;
    product: Product;
  };
};

export type CartProduct = Product;

// Menu and page types for static content
export type Menu = {
  title: string;
  path: string;
};

export type Page = {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
};
