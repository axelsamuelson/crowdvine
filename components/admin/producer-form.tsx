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
import {
  CreateProducerData,
  Producer,
  createProducer,
  updateProducer,
} from "@/lib/actions/producers";
import { getPickupZones, PalletZone } from "@/lib/actions/zones";

interface ProducerFormProps {
  producer?: Producer;
}

export default function ProducerForm({ producer }: ProducerFormProps) {
  const [formData, setFormData] = useState<CreateProducerData>({
    name: producer?.name || "",
    region: producer?.region || "",
    lat: producer?.lat || 0,
    lon: producer?.lon || 0,
    country_code: producer?.country_code || "",
    address_street: producer?.address_street || "",
    address_city: producer?.address_city || "",
    address_postcode: producer?.address_postcode || "",
    short_description: producer?.short_description || "",
    logo_image_path: producer?.logo_image_path || "",
    pickup_zone_id: producer?.pickup_zone_id || "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pickupZones, setPickupZones] = useState<PalletZone[]>([]);
  const [isPickupZone, setIsPickupZone] = useState(!!producer?.pickup_zone_id);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeSuccess, setGeocodeSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadPickupZones = async () => {
      try {
        const zones = await getPickupZones();
        setPickupZones(zones);
      } catch (err) {
        console.error("Failed to load pickup zones:", err);
      }
    };
    loadPickupZones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // If "Make this producer a pickup zone" is checked, create/update zone
      if (isPickupZone) {
        // Create or update pickup zone for this producer
        const zoneData = {
          name: `${formData.name} (Pickup)`,
          type: 'pickup' as const,
          lat: formData.lat,
          lon: formData.lon,
          address_city: formData.address_city,
          address_postcode: formData.address_postcode,
          country_code: formData.country_code,
        };

        console.log('📍 Sending zone creation request:', {
          producerId: producer?.id,
          zoneData,
        });

        const zoneResponse = await fetch('/api/admin/zones/for-producer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producerId: producer?.id,
            zoneData,
          }),
        });

        if (!zoneResponse.ok) {
          const errorData = await zoneResponse.json();
          console.error('❌ Zone creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create/update pickup zone');
        }

        const { zoneId } = await zoneResponse.json();
        console.log('✅ Zone created/updated:', zoneId);
        formData.pickup_zone_id = zoneId;
      } else if (!isPickupZone && producer?.pickup_zone_id) {
        // User unchecked the box - remove the pickup zone association
        formData.pickup_zone_id = "";
      }

      console.log('📝 Submitting producer data:', formData);

      if (producer) {
        await updateProducer(producer.id, formData);
      } else {
        const result = await createProducer(formData);
        console.log('✅ Producer created:', result);
      }
      router.push("/admin/producers");
    } catch (err) {
      console.error('❌ Producer creation error:', err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof CreateProducerData,
    value: string | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Reset geocode success when address changes
    if (['address_street', 'address_city', 'address_postcode', 'country_code'].includes(field)) {
      setGeocodeSuccess(false);
    }
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    setError("");
    setGeocodeSuccess(false);

    try {
      // Build address string
      const addressParts = [
        formData.address_street,
        formData.address_city,
        formData.address_postcode,
        formData.country_code,
      ].filter(Boolean);

      if (addressParts.length === 0) {
        throw new Error("Please fill in at least one address field");
      }

      const addressString = addressParts.join(", ");
      console.log("🔍 Geocoding address:", addressString);

      // Use Nominatim API (same as delivery zones)
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'PACT-Wines-Admin/1.0',
        },
      });

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        throw new Error("Address not found. Please check the address and try again.");
      }

      const location = results[0];
      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);

      console.log("✅ Geocoded to:", { lat, lon });

      // Update form data
      setFormData((prev) => ({
        ...prev,
        lat,
        lon,
      }));

      setGeocodeSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setGeocodeSuccess(false), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to geocode address");
      console.error("Geocoding error:", err);
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{producer ? "Edit Producer" : "Add Producer"}</CardTitle>
        <CardDescription>
          {producer
            ? "Update producer information"
            : "Create a new wine producer"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => handleChange("region", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude *</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={formData.lat}
                  onChange={(e) =>
                    handleChange("lat", parseFloat(e.target.value) || 0)
                  }
                  required
                  className={geocodeSuccess ? "border-green-500 bg-green-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lon">Longitude *</Label>
                <Input
                  id="lon"
                  type="number"
                  step="0.0001"
                  value={formData.lon}
                  onChange={(e) =>
                    handleChange("lon", parseFloat(e.target.value) || 0)
                  }
                  required
                  className={geocodeSuccess ? "border-green-500 bg-green-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country_code">Country Code *</Label>
                <Input
                  id="country_code"
                  value={formData.country_code}
                  onChange={(e) => handleChange("country_code", e.target.value)}
                  placeholder="FR"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !formData.address_city}
                variant="outline"
                className="w-auto"
              >
                {geocoding ? "Geocoding..." : "🌍 Get Coordinates from Address"}
              </Button>
              {geocodeSuccess && (
                <span className="text-sm text-green-600 font-medium">
                  ✅ Coordinates updated successfully!
                </span>
              )}
            </div>

            {formData.address_city && (
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border border-gray-200">
                📍 Will geocode: {[formData.address_street, formData.address_city, formData.address_postcode, formData.country_code].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_street">Street Address *</Label>
            <Input
              id="address_street"
              value={formData.address_street}
              onChange={(e) => handleChange("address_street", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">City *</Label>
              <Input
                id="address_city"
                value={formData.address_city}
                onChange={(e) => handleChange("address_city", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_postcode">Postal Code *</Label>
              <Input
                id="address_postcode"
                value={formData.address_postcode}
                onChange={(e) =>
                  handleChange("address_postcode", e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Description</Label>
            <Textarea
              id="short_description"
              value={formData.short_description}
              onChange={(e) =>
                handleChange("short_description", e.target.value)
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_image_path">Logo Image URL</Label>
            <Input
              id="logo_image_path"
              type="url"
              value={formData.logo_image_path}
              onChange={(e) => handleChange("logo_image_path", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <input
                type="checkbox"
                id="is_pickup_zone"
                checked={isPickupZone}
                onChange={(e) => setIsPickupZone(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <Label htmlFor="is_pickup_zone" className="font-semibold text-blue-900 cursor-pointer">
                  Make this producer a pickup zone
                </Label>
                <p className="text-sm text-blue-700 mt-1">
                  Automatically creates a pickup zone at the producer's location for pallet consolidation
                </p>
              </div>
            </div>

            {!isPickupZone && (
              <div className="space-y-2">
                <Label htmlFor="pickup_zone_id">Or select existing Pickup Zone</Label>
                <select
                  id="pickup_zone_id"
                  value={formData.pickup_zone_id || ""}
                  onChange={(e) => handleChange("pickup_zone_id", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:!ring-red-500"
                >
                  <option value="">No pickup zone selected</option>
                  {pickupZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {isPickupZone && (
              <div className="text-sm text-gray-600 p-3 bg-gray-50 border border-gray-200 rounded-md">
                ℹ️ A pickup zone named "<strong>{formData.name} (Pickup)</strong>" will be {producer?.pickup_zone_id ? 'updated' : 'created'} at this producer's location
              </div>
            )}
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
              {loading
                ? "Saving..."
                : producer
                  ? "Update Producer"
                  : "Create Producer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
