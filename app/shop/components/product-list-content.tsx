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
        <div className="mb-6 md:mb-8 relative">
          {/* Subtle background with premium gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.008] via-foreground/[0.004] to-transparent rounded-2xl"></div>
          
          {/* Main content container */}
          <div className="relative p-4 md:p-6 border border-foreground/[0.06] rounded-2xl backdrop-blur-sm">
            <div className="space-y-3 md:space-y-4">
              {/* Header section */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-light text-foreground tracking-wide">
                  Complete Your Order
                </h3>
                
                {/* Subtle indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-foreground/[0.04] rounded-full border border-foreground/[0.08]">
                  <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-foreground/60 tracking-wide">
                    {selectedProducers.length} producer{selectedProducers.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {/* Producer badges */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                {selectedProducers.map((producerHandle) => {
                  const collection = collections.find(c => c.handle === producerHandle);
                  return (
                    <div
                      key={producerHandle}
                      className="group relative"
                    >
                      <div className="px-3 md:px-4 py-2 md:py-2.5 bg-foreground/[0.02] hover:bg-foreground/[0.04] text-foreground/70 hover:text-foreground/90 text-xs md:text-sm font-medium rounded-xl border border-foreground/[0.06] hover:border-foreground/[0.12] transition-all duration-200 cursor-pointer">
                        {collection?.title || producerHandle}
                      </div>
                      
                      {/* Subtle hover effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  );
                })}
              </div>
              
              {/* Rule explanation */}
              <div className="pt-3 md:pt-4 border-t border-foreground/[0.04]">
                <p className="text-xs text-muted-foreground/60 font-light">
                  Each producer requires a minimum of 6 bottles for efficient shipping
                </p>
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
