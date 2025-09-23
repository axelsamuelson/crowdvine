"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DeleteWineBoxButton } from "@/components/admin/delete-wine-box-button";

interface WineBox {
  id: string;
  name: string;
  description: string;
  handle: string;
  margin_percentage: number;
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

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(0) + " SEK";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wine Boxes</CardTitle>
          <CardDescription>Loading wine boxes...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Wine Boxes</CardTitle>
        <CardDescription>
          Complete list of all wine box packages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Image
                </th>
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Wine Box
                </th>
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Margin
                </th>
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Pricing
                </th>
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Handle
                </th>
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Status
                </th>
                <th className="text-left p-3 font-medium text-sm text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {wineBoxes.map((box) => (
                <tr
                  key={box.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-3">
                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      {box.image_url ? (
                        <Image
                          src={box.image_url}
                          alt={box.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {box.name}
                      </div>
                      <div
                        className="text-sm text-gray-500 overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          maxHeight: "2.5rem",
                        }}
                      >
                        {box.description}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {box.margin_percentage}%
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-gray-500">Dynamic pricing</td>
                  <td className="p-3 text-sm text-gray-500 font-mono">
                    {box.handle}
                  </td>
                  <td className="p-3">
                    <Badge variant={box.is_active ? "default" : "secondary"}>
                      {box.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Link href={`/admin/wine-boxes/${box.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteWineBoxButton
                        wineBoxId={box.id}
                        wineBoxName={box.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {wineBoxes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No wine boxes found</p>
            <p className="text-sm text-gray-400 mb-4">
              Note: Make sure the wine_boxes database table is set up first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
