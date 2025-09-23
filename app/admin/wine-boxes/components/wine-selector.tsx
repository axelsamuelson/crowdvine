"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface Wine {
  id: string;
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  base_price_cents: number;
  label_image_path: string;
  producer_id: string;
}

interface SelectedWine {
  wineId: string;
  quantity: number;
}

interface WineSelectorProps {
  selectedWines: SelectedWine[];
  onWinesChange: (wines: SelectedWine[]) => void;
}

export function WineSelector({
  selectedWines,
  onWinesChange,
}: WineSelectorProps) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchWines();
  }, []);

  const fetchWines = async () => {
    try {
      const response = await fetch("/api/crowdvine/products?limit=100");
      if (response.ok) {
        const data = await response.json();
        setWines(data);
      }
    } catch (error) {
      console.error("Error fetching wines:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWineToggle = (wineId: string, checked: boolean) => {
    if (checked) {
      // Add wine with quantity 1
      const newWine: SelectedWine = { wineId, quantity: 1 };
      onWinesChange([...selectedWines, newWine]);
    } else {
      // Remove wine
      onWinesChange(selectedWines.filter((w) => w.wineId !== wineId));
    }
  };

  const handleQuantityChange = (wineId: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove wine if quantity is 0 or negative
      onWinesChange(selectedWines.filter((w) => w.wineId !== wineId));
    } else {
      // Update quantity
      onWinesChange(
        selectedWines.map((w) =>
          w.wineId === wineId ? { ...w, quantity } : w,
        ),
      );
    }
  };

  const isWineSelected = (wineId: string) => {
    return selectedWines.some((w) => w.wineId === wineId);
  };

  const getSelectedQuantity = (wineId: string) => {
    const selected = selectedWines.find((w) => w.wineId === wineId);
    return selected ? selected.quantity : 0;
  };

  const filteredWines = wines.filter(
    (wine) =>
      wine.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wine.variants?.[0]?.selectedOptions?.some((option) =>
        option.value?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(0) + " SEK";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-32 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="wine-search">Search Wines</Label>
        <Input
          id="wine-search"
          placeholder="Search by wine name or grape variety..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {filteredWines.map((wine) => {
          const isSelected = isWineSelected(wine.id);
          const quantity = getSelectedQuantity(wine.id);

          return (
            <Card
              key={wine.id}
              className={`cursor-pointer transition-colors ${
                isSelected
                  ? "ring-2 ring-blue-500 bg-blue-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleWineToggle(wine.id, checked as boolean)
                    }
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">
                        {wine.title || "Unknown Wine"}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {formatPrice(
                          wine.variants?.[0]?.price?.amount
                            ? parseFloat(wine.variants[0].price.amount) * 100
                            : 0,
                        )}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {wine.variants?.[0]?.selectedOptions
                        ?.map((option) => option.value)
                        .join(", ") || "No details"}
                    </p>

                    {isSelected && (
                      <div className="flex items-center space-x-2">
                        <Label
                          htmlFor={`quantity-${wine.id}`}
                          className="text-xs"
                        >
                          Quantity:
                        </Label>
                        <Input
                          id={`quantity-${wine.id}`}
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              wine.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-16 h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredWines.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No wines found matching your search.
        </div>
      )}
    </div>
  );
}
