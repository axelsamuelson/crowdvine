"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PalletZone {
  id: string;
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type: "delivery" | "pickup";
}

interface CreatePalletData {
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
}

interface Pallet {
  id: string;
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
}

interface PalletFormProps {
  pallet?: Pallet;
}

const inputDarkClass =
  "border-[#1F1F23] bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700";

const selectTriggerDarkClass =
  "border-[#1F1F23] bg-zinc-900 text-zinc-100";

const selectContentDarkClass =
  "border-[#1F1F23] bg-zinc-900 text-zinc-100";

export default function PalletForm({ pallet }: PalletFormProps) {
  const [formData, setFormData] = useState<CreatePalletData>({
    name: pallet?.name || "",
    description: pallet?.description || "",
    delivery_zone_id: pallet?.delivery_zone_id || "",
    pickup_zone_id: pallet?.pickup_zone_id || "",
    cost_cents: pallet?.cost_cents || 0,
    bottle_capacity: pallet?.bottle_capacity || 0,
  });

  const [deliveryZones, setDeliveryZones] = useState<PalletZone[]>([]);
  const [pickupZones, setPickupZones] = useState<PalletZone[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadZones = async () => {
      try {
        const [deliveryResponse, pickupResponse] = await Promise.all([
          fetch("/api/admin/zones?type=delivery"),
          fetch("/api/admin/zones?type=pickup"),
        ]);

        if (deliveryResponse.ok && pickupResponse.ok) {
          const [delivery, pickup] = await Promise.all([
            deliveryResponse.json(),
            pickupResponse.json(),
          ]);
          setDeliveryZones(delivery);
          setPickupZones(pickup);
        } else {
          setError("Failed to load zones");
        }
      } catch (err) {
        console.error("Failed to load zones:", err);
        setError("Failed to load zones");
      }
    };

    loadZones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate required fields
    const missingFields: string[] = [];

    if (!formData.name.trim()) missingFields.push("Name");
    if (!formData.delivery_zone_id) missingFields.push("Delivery Zone");
    if (!formData.pickup_zone_id) missingFields.push("Pickup Zone");
    if (formData.cost_cents < 0) missingFields.push("Cost");
    if (formData.bottle_capacity <= 0) missingFields.push("Bottle Capacity");

    if (missingFields.length > 0) {
      setError(
        `Please fill in the following required fields: ${missingFields.join(", ")}`,
      );
      setLoading(false);
      return;
    }

    // Validate that delivery and pickup zones are different
    if (formData.delivery_zone_id === formData.pickup_zone_id) {
      setError("Delivery zone and pickup zone must be different");
      setLoading(false);
      return;
    }

    try {
      const url = pallet
        ? `/api/admin/pallets/${pallet.id}`
        : "/api/admin/pallets";
      const method = pallet ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save pallet");
      }

      router.push("/admin/pallets");
    } catch (err) {
      console.error("Pallet creation error:", err);
      if (err instanceof Error) {
        setError(`Failed to save pallet: ${err.message}`);
      } else {
        setError("An unexpected error occurred while saving the pallet");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof CreatePalletData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (pallet) {
      router.push(`/admin/pallets/${pallet.id}`);
    } else {
      router.push("/admin/pallets");
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {error && (
        <Alert
          variant="destructive"
          className="border-red-500/30 bg-red-950/30 text-red-200"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6 rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Basic info
        </h2>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-zinc-300">
            Name
          </Label>
          <Input
            id="name"
            className={inputDarkClass}
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Standard Pallet"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm text-zinc-300">
            Description
          </Label>
          <Textarea
            id="description"
            className={inputDarkClass}
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Description of the pallet..."
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-6 rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Routing
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="delivery_zone_id" className="text-sm text-zinc-300">
              Delivery Zone
            </Label>
            <Select
              value={formData.delivery_zone_id}
              onValueChange={(value) =>
                handleChange("delivery_zone_id", value)
              }
              required
            >
              <SelectTrigger
                id="delivery_zone_id"
                className={selectTriggerDarkClass}
              >
                <SelectValue placeholder="Select delivery zone" />
              </SelectTrigger>
              <SelectContent className={selectContentDarkClass}>
                {deliveryZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_zone_id" className="text-sm text-zinc-300">
              Pickup Zone
            </Label>
            <Select
              value={formData.pickup_zone_id}
              onValueChange={(value) => handleChange("pickup_zone_id", value)}
              required
            >
              <SelectTrigger
                id="pickup_zone_id"
                className={selectTriggerDarkClass}
              >
                <SelectValue placeholder="Select pickup zone" />
              </SelectTrigger>
              <SelectContent className={selectContentDarkClass}>
                {pickupZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Capacity & Cost
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cost_cents" className="text-sm text-zinc-300">
              Cost (SEK)
            </Label>
            <Input
              id="cost_cents"
              type="number"
              step="0.01"
              className={inputDarkClass}
              value={(formData.cost_cents / 100).toFixed(2)}
              onChange={(e) =>
                handleChange(
                  "cost_cents",
                  Math.round(parseFloat(e.target.value) * 100) || 0,
                )
              }
              placeholder="150.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bottle_capacity" className="text-sm text-zinc-300">
              Bottle Capacity
            </Label>
            <Input
              id="bottle_capacity"
              type="number"
              className={inputDarkClass}
              value={formData.bottle_capacity}
              onChange={(e) =>
                handleChange("bottle_capacity", parseInt(e.target.value) || 0)
              }
              placeholder="72"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          className="text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        >
          {loading
            ? "Saving..."
            : pallet
              ? "Save changes"
              : "Create Pallet"}
        </Button>
      </div>
    </form>
  );
}
