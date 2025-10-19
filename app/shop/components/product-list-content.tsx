"use client";

import { useEffect, useMemo, useState } from "react";
import { Product, Collection } from "@/lib/shopify/types";
import { ProductCard } from "./product-card";
import ResultsControls from "./results-controls";
import { useProducts } from "../providers/products-provider";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { ProductGrid } from "./product-grid";
import { Card } from "../../../components/ui/card";
import { useCart } from "@/components/cart/cart-context";
import { ProducerValidation } from "@/lib/checkout-validation";
import { X } from "lucide-react";

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
  const { cart } = useCart();
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isHidden, setIsHidden] = useState(false);

  // Get current color filters from URL
  const [colorFilters] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Fetch validation data for selected producers
  useEffect(() => {
    const fetchValidations = async () => {
      if (!cart || selectedProducers.length === 0) {
        setValidations([]);
        return;
      }

      try {
        const response = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cart }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Validation result:', result); // Debug log
          console.log('All producerValidations:', result.producerValidations); // Debug log
          console.log('Selected producers:', selectedProducers); // Debug log
          
          const relevantValidations = result.producerValidations?.filter((v: ProducerValidation) => 
            selectedProducers.includes(v.producerHandle || '')
          ) || [];
          console.log('Relevant validations:', relevantValidations); // Debug log
          
          // Debug: Check if filtering is working
          result.producerValidations?.forEach((v: ProducerValidation, index: number) => {
            console.log(`All validation ${index}:`, {
              producerHandle: v.producerHandle,
              current: v.current,
              required: v.required,
              groupId: v.groupId,
              isSelected: selectedProducers.includes(v.producerHandle || '')
            });
          });
          
          relevantValidations.forEach((v, index) => {
            console.log(`Relevant validation ${index}:`, {
              producerHandle: v.producerHandle,
              current: v.current,
              required: v.required,
              groupId: v.groupId
            });
          });
          setValidations(relevantValidations);
        }
      } catch (error) {
        console.error('Failed to fetch validations:', error);
        setValidations([]);
      }
    };

    fetchValidations();
  }, [cart, selectedProducers]);

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
      {selectedProducers.length > 0 && !isHidden && (
        <>
          {/* Sticky compact progress indicator */}
          <div className="fixed top-20 right-4 z-40 max-w-xs">
            <div className="p-3 bg-background/95 backdrop-blur-md border border-foreground/[0.08] rounded-xl shadow-lg">
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-foreground/80 tracking-wide">
                    Complete Order
                  </h4>
                  <button
                    onClick={() => setIsHidden(true)}
                    className="text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Compact progress bars */}
                <div className="space-y-1.5">
                  {selectedProducers.slice(0, 2).map((producerHandle) => {
                    const collection = collections.find(c => c.handle === producerHandle);
                    const validation = validations.find(v => v.producerHandle === producerHandle);
                    const current = validation?.quantity || 0;
                    const required = (validation?.quantity || 0) + (validation?.needed || 0);
                    const progress = required > 0 ? Math.min((current / required) * 100, 100) : 0;
                    const remaining = validation?.needed || 0;
                    
                    // Debug log for progress bar rendering
                    console.log(`Progress bar for ${producerHandle}:`, {
                      validation,
                      current,
                      required,
                      progress,
                      remaining,
                      quantity: validation?.quantity,
                      needed: validation?.needed
                    });

                    return (
                      <div key={producerHandle} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground/70 truncate max-w-[120px]">
                            {collection?.title || producerHandle}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            {current}/{required}
                          </span>
                        </div>
                        <div className="relative h-1 bg-foreground/[0.06] rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-foreground/30 to-foreground/40 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show "and X more" if there are more than 2 producers */}
                  {selectedProducers.length > 2 && (
                    <div className="text-xs text-muted-foreground/50 text-center pt-1">
                      +{selectedProducers.length - 2} more
                    </div>
                  )}
                </div>
                
                {/* Status summary */}
                <div className="pt-1 border-t border-foreground/[0.04]">
                  <p className="text-xs text-muted-foreground/60 text-center">
                    Add bottles to complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Show button when hidden */}
      {selectedProducers.length > 0 && isHidden && (
        <div className="fixed top-20 right-4 z-40">
          <button
            onClick={() => setIsHidden(false)}
            className="p-2 bg-background/95 backdrop-blur-md border border-foreground/[0.08] rounded-lg shadow-lg text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            title="Show order progress"
          >
            <div className="w-4 h-4 border border-current rounded-full flex items-center justify-center">
              <span className="text-xs">!</span>
            </div>
          </button>
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
