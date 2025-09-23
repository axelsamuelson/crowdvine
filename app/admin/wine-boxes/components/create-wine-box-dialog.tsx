"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WineSelector } from "./wine-selector";

interface CreateWineBoxDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedWine {
  wineId: string;
  quantity: number;
}

export function CreateWineBoxDialog({
  isOpen,
  onClose,
}: CreateWineBoxDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    handle: "",
    margin_percentage: "",
    image_url: "",
  });
  const [selectedWines, setSelectedWines] = useState<SelectedWine[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedWines.length === 0) {
      alert("Please select at least one wine for the box.");
      return;
    }

    setLoading(true);

    try {
      // First create the wine box
      const wineBoxResponse = await fetch("/api/admin/wine-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          margin_percentage: parseFloat(formData.margin_percentage),
        }),
      });

      if (!wineBoxResponse.ok) {
        throw new Error("Failed to create wine box");
      }

      const wineBox = await wineBoxResponse.json();

      // Then add the wine items
      const wineItemsResponse = await fetch(
        `/api/admin/wine-boxes/${wineBox.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wineItems: selectedWines,
          }),
        },
      );

      if (!wineItemsResponse.ok) {
        throw new Error("Failed to add wines to box");
      }

      onClose();
      setFormData({
        name: "",
        description: "",
        handle: "",
        margin_percentage: "",
        image_url: "",
      });
      setSelectedWines([]);
      // Refresh the page to show the new wine box
      window.location.reload();
    } catch (error) {
      console.error("Error creating wine box:", error);
      alert("Failed to create wine box. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate handle from name
    if (field === "name") {
      const handle = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setFormData((prev) => ({
        ...prev,
        handle,
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Wine Box</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Organic Discovery Box"
                required
              />
            </div>
            <div>
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={formData.handle}
                onChange={(e) => handleInputChange("handle", e.target.value)}
                placeholder="e.g., organic-discovery-box"
                required
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
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="margin_percentage">Margin Percentage</Label>
              <Input
                id="margin_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.margin_percentage}
                onChange={(e) =>
                  handleInputChange("margin_percentage", e.target.value)
                }
                placeholder="15.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => handleInputChange("image_url", e.target.value)}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>
          </div>

          <div>
            <Label>Select Wines</Label>
            <WineSelector
              selectedWines={selectedWines}
              onWinesChange={setSelectedWines}
            />
            {selectedWines.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Selected {selectedWines.length} wine(s) with{" "}
                {selectedWines.reduce((sum, w) => sum + w.quantity, 0)} total
                bottles
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedWines.length === 0}
            >
              {loading ? "Creating..." : "Create Wine Box"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
