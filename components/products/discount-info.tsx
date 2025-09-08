"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiscountInfoProps {
  originalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  finalPrice: number;
  wines: Array<{
    wineId: string;
    wineName: string;
    vintage: string;
    price: number;
    quantity: number;
  }>;
}

export function DiscountInfo({
  originalPrice,
  discountAmount,
  discountPercentage,
  finalPrice,
  wines,
}: DiscountInfoProps) {
  const formatPrice = (price: number) => {
    return price.toFixed(0) + " SEK";
  };

  const totalBottles = wines.reduce((sum, wine) => sum + wine.quantity, 0);

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-green-800 flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {discountPercentage}% OFF
          </Badge>
          Special Box Price
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Individual prices:</span>
          <span className="text-sm line-through text-muted-foreground">
            {formatPrice(originalPrice)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Box discount:</span>
          <span className="text-sm font-medium text-green-700">
            -{formatPrice(discountAmount)}
          </span>
        </div>
        
        <div className="border-t pt-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Box price ({totalBottles} bottles):</span>
            <span className="text-lg font-bold text-green-800">
              {formatPrice(finalPrice)}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Included wines:</p>
          <ul className="space-y-1">
            {wines.map((wine) => (
              <li key={wine.wineId} className="flex justify-between">
                <span>{wine.wineName} {wine.vintage}</span>
                <span className="text-muted-foreground">
                  {wine.quantity}x {formatPrice(wine.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

