"use client";

import { useEffect, useMemo } from "react";
import { Product, Collection } from "@/lib/shopify/types";
import { ProductCard } from "./product-card";
import ResultsControls from "./results-controls";
import { useProducts } from "../providers/products-provider";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { ProductGrid } from "./product-grid";
import { Card } from "../../../components/ui/card";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

interface ProductListContentProps {
  products: Product[];
  collections: Collection[];
  selectedProducers?: string[];
  collectionHandle?: string;
}

// Client-side color filtering function
function filterProductsByColors(
  products: Product[],
  colors: string[],
): Product[] {
  if (!colors || colors.length === 0) {
    return products;
  }

  const filteredProducts = products.filter((product) => {
    // Check if product has any variants with the selected colors
    // Note: variants is now a simple array after adaptShopifyProduct transformation
    const hasMatchingColor = product.variants?.some((variant: any) => {
      if (!variant.selectedOptions) return false;

      // Look for color option in variant
      return variant.selectedOptions.some((option: any) => {
        const isColorOption =
          option.name.toLowerCase().includes("color") ||
          option.name.toLowerCase().includes("colour");

        if (!isColorOption) return false;

        // Check if this variant's color matches any of the selected colors
        const variantColor = option.value;

        return colors.some((selectedColor) => {
          // For blend colors (Red/Orange), match against "Red & Orange" in product
          const normalizedSelected = selectedColor.replace("/", " & ");
          const normalizedVariant = variantColor.replace("/", " & ");

          return normalizedSelected === normalizedVariant;
        });
      });
    });

    // Also check product-level options as fallback
    if (!hasMatchingColor && product.options) {
      const colorOption = product.options.find(
        (opt: any) =>
          opt.name.toLowerCase().includes("color") ||
          opt.name.toLowerCase().includes("colour"),
      );

      if (colorOption && colorOption.values) {
        return colorOption.values.some((value: any) => {
          // Handle both string values and object values with .name property
          const colorValue =
            typeof value === "string" ? value : value.name || value.id;

          return colors.some((selectedColor) => {
            // For blend colors (Red/Orange), match against "Red & Orange" in product
            const normalizedSelected = selectedColor.replace("/", " & ");
            const normalizedValue = colorValue.replace("/", " & ");

            return normalizedSelected === normalizedValue;
          });
        });
      }
    }

    return hasMatchingColor;
  });

  return filteredProducts;
}

function filterProductsByGrapes(products: Product[], grapes: string[]): Product[] {
  if (!grapes || grapes.length === 0) return products;

  const wanted = new Set(grapes.map((g) => g.toLowerCase()));
  return products.filter((product) => {
    // Prefer explicit "Grape Varieties" option if present
    const opt = product.options?.find((o: any) =>
      String(o?.name || "").toLowerCase().includes("grape"),
    );
    if (opt?.values?.length) {
      return opt.values.some((v: any) => {
        const name = typeof v === "string" ? v : v?.name;
        return name && wanted.has(String(name).toLowerCase());
      });
    }

    // Fallback: variant selected options
    if (product.variants?.length) {
      return product.variants.some((variant: any) => {
        return (variant?.selectedOptions || []).some((so: any) => {
          const n = String(so?.name || "").toLowerCase();
          if (!n.includes("grape")) return false;
          const value = String(so?.value || "").toLowerCase();
          return wanted.has(value);
        });
      });
    }

    // Last fallback: tags
    if (product.tags?.length) {
      return product.tags.some((t) => wanted.has(String(t || "").toLowerCase()));
    }

    return false;
  });
}

export function ProductListContent({
  products,
  collections,
  selectedProducers = [],
  collectionHandle,
}: ProductListContentProps & { collectionHandle?: string }) {
  const { setProducts, setOriginalProducts } = useProducts();

  // Get current color filters from URL
  const [colorFilters] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const [grapeFilters] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Apply client-side filtering whenever products or filters change
  const filteredProducts = useMemo(() => {
    let out = products;
    if (colorFilters?.length) out = filterProductsByColors(out, colorFilters);
    if (grapeFilters?.length) out = filterProductsByGrapes(out, grapeFilters);
    return out;
  }, [products, colorFilters, grapeFilters]);

  // Set both original and filtered products in the provider whenever they change
  useEffect(() => {
    setOriginalProducts(products);
    setProducts(filteredProducts);
  }, [products, filteredProducts, setProducts, setOriginalProducts]);

  // Track product list viewed event
  useEffect(() => {
    // Check if viewing a collection (producer filter)
    const isCollectionPage = !!collectionHandle && collectionHandle !== 'joyco-root' && collectionHandle !== 'all-wines';

    // For PLP/PDP analytics by dimension (wine/producer), we attach the products shown in this list view.
    // Keep payload bounded to avoid huge JSON in `event_metadata`.
    const shownProducts = filteredProducts.slice(0, 200);
    const productIds = shownProducts.map((p) => p.id);
    const producerIds = Array.from(
      new Set(
        shownProducts
          .map((p: any) => p.producerId as string | undefined)
          .filter(Boolean),
      ),
    );
    
    AnalyticsTracker.trackEvent({
      eventType: "product_list_viewed",
      eventCategory: "navigation",
      metadata: { 
        productCount: filteredProducts.length,
        totalProducts: products.length,
        hasFilters: colorFilters.length > 0 || grapeFilters.length > 0 || selectedProducers.length > 0 || isCollectionPage,
        collectionHandle: collectionHandle,
        isCollectionPage: isCollectionPage,
        productIds,
        producerIds,
      }
    });
  }, [filteredProducts.length, products.length, colorFilters.length, grapeFilters.length, selectedProducers.length, collectionHandle]);

  return (
    <>
      <ResultsControls
        className="max-md:hidden"
        collections={collections}
        products={filteredProducts}
      />

      {filteredProducts.length > 0 ? (
        <ProductGrid>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ProductGrid>
      ) : (
        <Card className="flex mr-sides flex-1 items-center justify-center">
          <p className="text text-muted-foreground font-medium">
            No products found
          </p>
        </Card>
      )}
    </>
  );
}