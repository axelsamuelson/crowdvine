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
  priceBreakdown?: {
    costAmount: number;
    exchangeRate: number;
    alcoholTaxCents: number;
    marginPercentage: number;
    b2bMarginPercentage?: number;
    b2bPriceExclVat?: number;
  };
  /** B2B price exkl moms when b2b_margin_percentage is set (from list API) */
  b2bPriceExclVat?: number;
  /** B2B stock quantity (wines). Null/0 = out of stock. Used for stock badges. */
  b2bStock?: number | null;
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
  cost: {
    totalAmount: Money;
  };
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
