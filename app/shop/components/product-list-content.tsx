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
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import Link from "next/link";

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

export function ProductListContent({
  products,
  collections,
  selectedProducers = [],
  collectionHandle,
}: ProductListContentProps & { collectionHandle?: string }) {
  const { setProducts, setOriginalProducts } = useProducts();
  const { cart } = useCart();
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isHidden, setIsHidden] = useState(false);

  // Get current color filters from URL
  const [colorFilters] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Fetch validation data for cart producers
  useEffect(() => {
    const fetchValidations = async () => {
      if (!cart || cart.lines.length === 0) {
        setValidations([]);
        return;
      }

      try {
        const response = await fetch("/api/cart/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cart }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Validation result:", result); // Debug log
          console.log("All producerValidations:", result.producerValidations); // Debug log
          console.log("Selected producers:", selectedProducers); // Debug log

          // If we have selectedProducers (from URL), filter to only those
          // Otherwise, show all producers with validation errors
          const relevantValidations =
            selectedProducers.length > 0
              ? result.producerValidations?.filter((v: ProducerValidation) =>
                  selectedProducers.includes(v.producerHandle || ""),
                ) || []
              : result.producerValidations?.filter(
                  (v: ProducerValidation) => !v.isValid,
                ) || [];

          console.log("Relevant validations:", relevantValidations); // Debug log

          // Debug: Check if filtering is working
          result.producerValidations?.forEach(
            (v: ProducerValidation, index: number) => {
              console.log(`All validation ${index}:`, {
                producerHandle: v.producerHandle,
                current: v.current,
                required: v.required,
                groupId: v.groupId,
                isSelected: selectedProducers.includes(v.producerHandle || ""),
                isValid: v.isValid,
              });
            },
          );

          relevantValidations.forEach((v, index) => {
            console.log(`Relevant validation ${index}:`, {
              producerHandle: v.producerHandle,
              current: v.current,
              required: v.required,
              groupId: v.groupId,
            });
          });
          setValidations(relevantValidations);
        }
      } catch (error) {
        console.error("Failed to fetch validations:", error);
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

  // Track product list viewed event
  useEffect(() => {
    // Check if viewing a collection (producer filter)
    const isCollectionPage = !!collectionHandle && collectionHandle !== 'joyco-root' && collectionHandle !== 'all-wines';
    
    AnalyticsTracker.trackEvent({
      eventType: "product_list_viewed",
      eventCategory: "navigation",
      metadata: { 
        productCount: filteredProducts.length,
        totalProducts: products.length,
        hasFilters: colorFilters.length > 0 || selectedProducers.length > 0 || isCollectionPage,
        collectionHandle: collectionHandle,
        isCollectionPage: isCollectionPage
      }
    });
  }, [filteredProducts.length, products.length, colorFilters.length, selectedProducers.length, collectionHandle]);

  return (
    <>
      {validations.length > 0 && !isHidden && (
        <>
          {/* Order completion rail (slim, next to filters/menu on desktop) */}
          <div className="md:sticky md:top-16 z-40 pr-sides pl-2 max-md:fixed max-md:bottom-4 max-md:left-4 max-md:right-4 max-md:z-50">
            <div className="bg-white border border-gray-200 rounded-full shadow-sm px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-900 tracking-wide whitespace-nowrap">
                    Complete order
                  </div>
                  <div className="h-4 w-px bg-gray-200" />

                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {validations.slice(0, 2).map((validation) => {
                      const collection = collections.find(
                        (c) => c.handle === validation.producerHandle,
                      );
                      const current = validation?.quantity || 0;
                      const required =
                        (validation?.quantity || 0) + (validation?.needed || 0);
                      const progress =
                        required > 0
                          ? Math.min((current / required) * 100, 100)
                          : 0;

                      return (
                        <div key={validation.producerHandle} className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 truncate">
                              {collection?.title || validation.producerHandle}
                            </span>
                            <span className="text-[11px] text-gray-500 tabular-nums shrink-0">
                              {current}/{required}
                            </span>
                          </div>
                          <div className="mt-1 relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-black rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {validations.length > 2 && (
                      <div className="text-[11px] text-gray-500">
                        +{validations.length - 2} more producers
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/checkout"
                    className="inline-flex items-center justify-center rounded-full bg-black text-white px-4 py-2 text-xs font-medium hover:bg-black/90 transition-colors"
                  >
                    Checkout
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsHidden(true)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Hide order progress"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Show button when hidden */}
      {validations.length > 0 && isHidden && (
        <div className="md:sticky md:top-16 z-40 pr-sides pl-2 max-md:fixed max-md:bottom-4 max-md:right-4 max-md:z-50">
          <button
            onClick={() => setIsHidden(false)}
            className="h-10 px-4 bg-white border border-gray-200 rounded-full shadow-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
            title="Show order progress"
          >
            <span className="text-xs font-medium">Complete order</span>
            <span className="text-[11px] text-gray-500 tabular-nums">
              {validations.length}
            </span>
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