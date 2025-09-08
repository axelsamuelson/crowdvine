"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WineSelector } from "../../components/wine-selector";
import { ImageUpload } from "@/components/admin/image-upload";

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

interface WineBoxItem {
  id: string;
  wine_box_id: string;
  wine_id: string;
  quantity: number;
  wine?: {
    id: string;
    title: string;
    variants?: Array<{
      price?: { amount: string };
      selectedOptions?: Array<{ value: string }>;
    }>;
  };
}

interface SelectedWine {
  wineId: string;
  quantity: number;
}

interface WineBoxFormProps {
  wineBox?: WineBox;
  wineBoxItems?: WineBoxItem[];
}

export default function WineBoxForm({ wineBox, wineBoxItems = [] }: WineBoxFormProps) {
  const [formData, setFormData] = useState({
    name: wineBox?.name || "",
    description: wineBox?.description || "",
    handle: wineBox?.handle || "",
    margin_percentage: wineBox?.margin_percentage?.toString() || "",
    image_url: wineBox?.image_url || "",
    is_active: wineBox?.is_active ?? true,
  });

  const [selectedWines, setSelectedWines] = useState<SelectedWine[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Initialize selected wines from existing wine box items
  useEffect(() => {
    if (wineBoxItems && wineBoxItems.length > 0) {
      const initialWines = wineBoxItems.map(item => ({
        wineId: item.wine_id,
        quantity: item.quantity
      }));
      setSelectedWines(initialWines);
    }
  }, [wineBoxItems]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate handle from name
    if (field === "name") {
      const handle = value.toString().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setFormData(prev => ({ ...prev, handle }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedWines.length === 0) {
      setError("Please select at least one wine for the box.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload images if any new ones were added
      let imagePath = "";
      if (images.length > 0) {
        const formDataUpload = new FormData();
        images.forEach((image) => {
          formDataUpload.append("files", image);
        });

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload images");
        }

        const uploadResult = await uploadResponse.json();
        imagePath = uploadResult.files[0] || "";
      }

      const wineBoxData = {
        ...formData,
        margin_percentage: parseFloat(formData.margin_percentage),
        image_url: imagePath || formData.image_url,
      };

      if (wineBox) {
        // Update existing wine box
        const wineBoxResponse = await fetch(`/api/admin/wine-boxes/${wineBox.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wineBoxData),
        });

        if (!wineBoxResponse.ok) {
          throw new Error("Failed to update wine box");
        }

        // Update wine items
        const wineItemsResponse = await fetch(`/api/admin/wine-boxes/${wineBox.id}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wineItems: selectedWines }),
        });

        if (!wineItemsResponse.ok) {
          throw new Error("Failed to update wine items");
        }
      } else {
        // Create new wine box
        const wineBoxResponse = await fetch("/api/admin/wine-boxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wineBoxData),
        });

        if (!wineBoxResponse.ok) {
          throw new Error("Failed to create wine box");
        }

        const newWineBox = await wineBoxResponse.json();

        // Add wine items
        const wineItemsResponse = await fetch(`/api/admin/wine-boxes/${newWineBox.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wineItems: selectedWines }),
        });

        if (!wineItemsResponse.ok) {
          throw new Error("Failed to add wine items");
        }
      }

      router.push("/admin/wine-boxes");
      router.refresh();
    } catch (error) {
      console.error("Error saving wine box:", error);
      setError("Failed to save wine box. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Wine Box Information</CardTitle>
          <CardDescription>
            Basic information about the wine box
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                placeholder="e.g., Organic Discovery Box"
              />
            </div>
            <div>
              <Label htmlFor="handle">Handle *</Label>
              <Input
                id="handle"
                value={formData.handle}
                onChange={(e) => handleInputChange("handle", e.target.value)}
                required
                placeholder="e.g., organic-discovery-box"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the wine box..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="margin_percentage">Margin Percentage (%)</Label>
              <Input
                id="margin_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.margin_percentage}
                onChange={(e) => handleInputChange("margin_percentage", e.target.value)}
                placeholder="15.00"
              />
            </div>
          </div>

          <div>
            <Label>Wine Box Image</Label>
            <ImageUpload images={images} onImagesChange={setImages} />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange("is_active", e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wine Selection</CardTitle>
          <CardDescription>
            Select wines to include in this box
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WineSelector 
            selectedWines={selectedWines} 
            onWinesChange={setSelectedWines} 
          />
          {selectedWines.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                Selected {selectedWines.length} wine(s) with {selectedWines.reduce((sum, w) => sum + w.quantity, 0)} total bottles
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || selectedWines.length === 0}
        >
          {loading ? "Saving..." : wineBox ? "Update Wine Box" : "Create Wine Box"}
        </Button>
      </div>
    </form>
  );
}
