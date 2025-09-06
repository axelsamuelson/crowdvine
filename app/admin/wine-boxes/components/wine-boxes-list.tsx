"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import Image from "next/image";

interface WineBox {
  id: string;
  name: string;
  description: string;
  handle: string;
  price_cents: number;
  bottle_count: number;
  box_type: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function WineBoxesList() {
  const [wineBoxes, setWineBoxes] = useState<WineBox[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWineBoxes();
  }, []);

  const fetchWineBoxes = async () => {
    try {
      const response = await fetch("/api/admin/wine-boxes");
      if (response.ok) {
        const data = await response.json();
        setWineBoxes(data);
      } else {
        // If database table doesn't exist yet, show empty state
        console.log("Wine boxes table not set up yet");
        setWineBoxes([]);
      }
    } catch (error) {
      console.error("Error fetching wine boxes:", error);
      setWineBoxes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wine box?")) return;
    
    try {
      const response = await fetch(`/api/admin/wine-boxes/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setWineBoxes(wineBoxes.filter(box => box.id !== id));
      }
    } catch (error) {
      console.error("Error deleting wine box:", error);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(0) + " SEK";
  };

  const getBoxTypeColor = (type: string) => {
    switch (type) {
      case "organic":
        return "bg-green-100 text-green-800";
      case "light-reds":
        return "bg-red-100 text-red-800";
      case "pet-nat":
        return "bg-blue-100 text-blue-800";
      case "premium-mixed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {wineBoxes.map((box) => (
        <Card key={box.id} className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{box.name}</CardTitle>
                <Badge className={getBoxTypeColor(box.box_type)}>
                  {box.box_type.replace("-", " ")}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDelete(box.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative h-32 mb-4 rounded-md overflow-hidden">
              <Image
                src={box.image_url}
                alt={box.name}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {box.description}
            </p>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold">{formatPrice(box.price_cents)}</span>
              <span className="text-muted-foreground">
                {box.bottle_count} bottles
              </span>
            </div>
            <div className="mt-2">
              <Badge variant={box.is_active ? "default" : "secondary"}>
                {box.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {wineBoxes.length === 0 && !loading && (
        <div className="col-span-full text-center py-12">
          <p className="text-muted-foreground text-lg mb-4">
            No wine boxes found. Create your first wine box to get started.
          </p>
          <p className="text-sm text-muted-foreground">
            Note: Make sure the wine_boxes database table is set up first.
          </p>
        </div>
      )}
    </div>
  );
}
