"use client";

import { useEffect, useMemo } from "react";
import { Product, Collection } from "@/lib/shopify/types";
import { ProductCard } from "./product-card";
import ResultsControls from "./results-controls";
import { useProducts } from "../providers/products-provider";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { ProductGrid } from "./product-grid";
import { Card } from "../../../components/ui/card";

interface ProductListContentProps {
  products: Product[];
  collections: Collection[];
  selectedProducers?: string[];
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
          const normalizedSelected = selectedColor.replace('/', ' & ');
          const normalizedVariant = variantColor.replace('/', ' & ');
          
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
            const normalizedSelected = selectedColor.replace('/', ' & ');
            const normalizedValue = colorValue.replace('/', ' & ');
            
            return normalizedSelected === normalizedValue;
          });
        });
      }
    }

    return hasMatchingColor;
  });

  return filteredProducts;
}

export function ProductListContent({
  products,
  collections,
  selectedProducers = [],
}: ProductListContentProps) {
  const { setProducts, setOriginalProducts } = useProducts();

  // Get current color filters from URL
  const [colorFilters] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Apply client-side filtering whenever products or color filters change
  const filteredProducts = useMemo(() => {
    if (!colorFilters || colorFilters.length === 0) {
      return products;
    }
    return filterProductsByColors(products, colorFilters);
  }, [products, colorFilters]);

  // Set both original and filtered products in the provider whenever they change
  useEffect(() => {
    setOriginalProducts(products);
    setProducts(filteredProducts);
  }, [products, filteredProducts, setProducts, setOriginalProducts]);

  return (
    <>
      {selectedProducers.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-amber-600 text-xs font-bold">!</span>
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">
                Complete Your Order
              </h3>
              <p className="text-sm text-amber-800 mb-2">
                Add more bottles from these producers to complete your order. Each producer requires a minimum of 6 bottles.
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedProducers.map((producerHandle) => {
                  const collection = collections.find(c => c.handle === producerHandle);
                  return (
                    <span
                      key={producerHandle}
                      className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded"
                    >
                      {collection?.title || producerHandle}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
