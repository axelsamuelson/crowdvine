"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreatePalletZoneData,
  PalletZone,
  createPalletZone,
  updatePalletZone,
} from "@/lib/actions/zones";
import { geocodeAddress } from "@/lib/geocoding";

interface ZoneFormProps {
  zone?: PalletZone;
}

export default function ZoneForm({ zone }: ZoneFormProps) {
  const [formData, setFormData] = useState<CreatePalletZoneData>({
    name: zone?.name || "",
    radius_km: zone?.radius_km || 500,
    center_lat: zone?.center_lat || 0,
    center_lon: zone?.center_lon || 0,
    zone_type: zone?.zone_type || "delivery",
  });

  const [addressInput, setAddressInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (zone) {
        await updatePalletZone(zone.id, formData);
      } else {
        await createPalletZone(formData);
      }
      router.push("/admin/zones");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof CreatePalletZoneData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeocodeAddress = async () => {
    if (!addressInput.trim()) {
      setError("Please enter an address to geocode");
      return;
    }

    setGeocodingLoading(true);
    setError("");

    try {
      const result = await geocodeAddress(addressInput.trim());
      
      if ('error' in result) {
        setError(`Geocoding failed: ${result.message}`);
      } else {
        setFormData(prev => ({
          ...prev,
          center_lat: result.lat,
          center_lon: result.lon
        }));
        setError("");
        console.log('✅ Coordinates updated:', result.lat, result.lon);
      }
    } catch (err) {
      setError(`Geocoding error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeocodingLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{zone ? "Edit Zone" : "Add Zone"}</CardTitle>
        <CardDescription>
          {zone ? "Update zone configuration" : "Create a new delivery zone"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Zone Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Béziers 500 km"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone_type">Zone Type *</Label>
            <select
              id="zone_type"
              value={formData.zone_type}
              onChange={(e) =>
                handleChange(
                  "zone_type",
                  e.target.value as "delivery" | "pickup",
                )
              }
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:!ring-red-500"
              required
            >
              <option value="delivery">Delivery Zone</option>
              <option value="pickup">Pickup Zone</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Center Address (for automatic coordinates)</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Stockholm, Sweden or Grevgatan 49, 11458 Stockholm"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGeocodeAddress}
                disabled={geocodingLoading || !addressInput.trim()}
              >
                {geocodingLoading ? "Getting..." : "Get Coordinates"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter an address to automatically get coordinates, or manually enter them below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="center_lat">Center Latitude *</Label>
              <Input
                id="center_lat"
                type="number"
                step="0.0001"
                value={formData.center_lat}
                onChange={(e) =>
                  handleChange("center_lat", parseFloat(e.target.value) || 0)
                }
                placeholder="59.3293"
                required
              />
              <p className="text-xs text-muted-foreground">Auto-filled when using address above</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="center_lon">Center Longitude *</Label>
              <Input
                id="center_lon"
                type="number"
                step="0.0001"
                value={formData.center_lon}
                onChange={(e) =>
                  handleChange("center_lon", parseFloat(e.target.value) || 0)
                }
                placeholder="18.0686"
                required
              />
              <p className="text-xs text-muted-foreground">Auto-filled when using address above</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius_km">Radius (km) *</Label>
              <Input
                id="radius_km"
                type="number"
                step="1"
                value={formData.radius_km}
                onChange={(e) =>
                  handleChange("radius_km", parseInt(e.target.value) || 0)
                }
                placeholder="50"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : zone ? "Update Zone" : "Create Zone"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
