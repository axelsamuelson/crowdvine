"use client";

import { Product } from "@/lib/shopify/types";
import { formatPrice } from "@/lib/shopify/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WineBoxDiscountInfoProps {
  product: Product;
}

export function WineBoxDiscountInfo({ product }: WineBoxDiscountInfoProps) {
  // Check if this is a wine box product
  if (product.productType !== "wine-box" || !(product as any).discountInfo) {
    return null;
  }

  const discountInfo = (product as any).discountInfo;
  const wines = discountInfo.wines || [];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {discountInfo.discountPercentage}% OFF
          </Badge>
          Discount Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Individual Price:</span>
            <div className="font-semibold">
              {formatPrice(discountInfo.totalWinePrice.toFixed(2), "SEK")}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">You Save:</span>
            <div className="font-semibold text-green-600">
              {formatPrice(discountInfo.discountAmount.toFixed(2), "SEK")}
            </div>
          </div>
        </div>
        
        <div>
          <span className="text-muted-foreground text-sm">Wines included:</span>
          <div className="mt-2 space-y-1">
            {wines.map((wine: any, index: number) => (
              <div key={index} className="text-sm">
                • {wine.wine_name} {wine.vintage} - {formatPrice(wine.price.toFixed(2), "SEK")}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
