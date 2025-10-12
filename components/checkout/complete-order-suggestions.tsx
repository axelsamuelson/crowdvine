"use client";

import { useState, useEffect } from "react";
import { ProducerValidation } from "@/lib/checkout-validation";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MemberPrice } from "@/components/ui/member-price";

interface Product {
  id: string;
  title: string;
  handle: string;
  producerId: string;
  producerName: string;
  featuredImage: {
    url: string;
    altText?: string;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface CompleteOrderSuggestionsProps {
  validations: ProducerValidation[];
}

export function CompleteOrderSuggestions({
  validations,
}: CompleteOrderSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const hasInvalid = validations.some((v) => !v.isValid);
  const invalidValidations = validations.filter((v) => !v.isValid);

  useEffect(() => {
    if (validations.length === 0) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Get all producer IDs from validations (including valid ones for upsell)
        const producerIds = validations.map((v) => v.producerId);

        // Fetch products from these producers
        const productsPromises = producerIds.map((producerId) =>
          fetch(`/api/crowdvine/collections/${producerId}/products?limit=12`).then((r) =>
            r.json()
          )
        );

        const productsArrays = await Promise.all(productsPromises);
        const allProducts = productsArrays.flat();

        setSuggestedProducts(allProducts);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [validations]);

  if (validations.length === 0) {
    return null;
  }

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      console.log("🛒 [Suggestions] Adding to cart:", product.title);
      
      // Use the simple-add API directly
      const response = await fetch("/api/cart/simple-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: product.id,
        }),
      });

      if (response.ok) {
        console.log("✅ [Suggestions] Added successfully");
        // Dispatch cart refresh event
        window.dispatchEvent(new CustomEvent("cart-refresh"));
        
        // Small success feedback
        const button = e.currentTarget as HTMLButtonElement;
        button.style.backgroundColor = "#10b981";
        setTimeout(() => {
          button.style.backgroundColor = "";
        }, 500);
      } else {
        console.error("❌ [Suggestions] Failed to add");
      }
    } catch (error) {
      console.error("❌ [Suggestions] Error adding to cart:", error);
    }
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {hasInvalid ? "Complete Your Order" : "Add More Wines"}
            </CardTitle>
            {hasInvalid && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                {invalidValidations.length} incomplete
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Show requirement summary */}
          {hasInvalid && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                Add bottles to reach multiples of 6:
              </p>
              {invalidValidations.map((validation, index) => (
                <div
                  key={index}
                  className="text-xs flex items-center justify-between px-2 py-1.5 bg-amber-50 rounded"
                >
                  <span className="font-medium text-gray-900">
                    {validation.producerName}
                  </span>
                  <span className="text-amber-700">
                    +{validation.needed} needed
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Suggested products grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-md" />
              ))}
            </div>
          ) : suggestedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {suggestedProducts.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="group relative bg-gray-50 rounded-md overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square relative">
                    <Image
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText || product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium text-gray-900 line-clamp-1">
                      {product.title}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {product.producerName}
                    </p>
                    <div className="flex items-center justify-between">
                      <MemberPrice
                        amount={product.priceRange.minVariantPrice.amount}
                        currencyCode={product.priceRange.minVariantPrice.currencyCode}
                        className="text-xs font-semibold"
                        showBadge={false}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-green-100"
                        onClick={(e) => handleAddToCart(product, e)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">
              No additional wines available
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

