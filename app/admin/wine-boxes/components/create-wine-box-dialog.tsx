"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateWineBoxDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWineBoxDialog({ isOpen, onClose }: CreateWineBoxDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    handle: "",
    price_cents: "",
    bottle_count: "",
    box_type: "",
    image_url: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/wine-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          price_cents: parseInt(formData.price_cents),
          bottle_count: parseInt(formData.bottle_count),
        }),
      });

      if (response.ok) {
        onClose();
        setFormData({
          name: "",
          description: "",
          handle: "",
          price_cents: "",
          bottle_count: "",
          box_type: "",
          image_url: "",
        });
        // Refresh the page to show the new wine box
        window.location.reload();
      }
    } catch (error) {
      console.error("Error creating wine box:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Auto-generate handle from name
    if (field === "name") {
      const handle = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setFormData(prev => ({
        ...prev,
        handle,
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Wine Box</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price_cents">Price (SEK)</Label>
              <Input
                id="price_cents"
                type="number"
                value={formData.price_cents}
                onChange={(e) => handleInputChange("price_cents", e.target.value)}
                placeholder="450"
                required
              />
            </div>
            <div>
              <Label htmlFor="bottle_count">Bottle Count</Label>
              <Input
                id="bottle_count"
                type="number"
                value={formData.bottle_count}
                onChange={(e) => handleInputChange("bottle_count", e.target.value)}
                placeholder="3"
                required
              />
            </div>
            <div>
              <Label htmlFor="box_type">Box Type</Label>
              <Select value={formData.box_type} onValueChange={(value) => handleInputChange("box_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Organic</SelectItem>
                  <SelectItem value="light-reds">Light Reds</SelectItem>
                  <SelectItem value="pet-nat">Pet-Nat</SelectItem>
                  <SelectItem value="premium-mixed">Premium Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Wine Box"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
