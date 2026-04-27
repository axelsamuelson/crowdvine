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
import { Switch } from "@/components/ui/switch";
import { CreateProducerData, Producer } from "@/lib/actions/producers";

type CountryOption = { code: string; name: string };
type RegionOption = { value: string; label: string; country_code: string | null };

type ShippingRegionOption = {
  id: string;
  name: string;
  country_code: string;
};

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
    shipping_region_id: producer?.shipping_region_id ?? "",
    is_pallet_zone: producer?.is_pallet_zone === true,
    is_live: producer?.is_live ?? true,
    boost_active: producer?.boost_active === true,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [shippingRegions, setShippingRegions] = useState<
    ShippingRegionOption[]
  >([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeSuccess, setGeocodeSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch("/api/countries");
        if (res.ok) {
          const data = await res.json();
          setCountries(data.countries ?? []);
        }
      } catch (err) {
        console.error("Failed to load countries:", err);
      }
    };
    loadCountries();
  }, []);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const url = formData.country_code
          ? `/api/regions?country_code=${encodeURIComponent(formData.country_code)}`
          : "/api/regions";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setRegions(data.regions ?? []);
        }
      } catch (err) {
        console.error("Failed to load regions:", err);
      }
    };
    loadRegions();
  }, [formData.country_code]);

  useEffect(() => {
    const loadShippingRegions = async () => {
      try {
        const res = await fetch("/api/admin/shipping-regions");
        if (!res.ok) return;
        const data = (await res.json()) as {
          regions?: ShippingRegionOption[];
        };
        const list = data.regions ?? [];
        setShippingRegions(
          [...list].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (err) {
        console.error("Failed to load shipping regions:", err);
      }
    };
    loadShippingRegions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        shipping_region_id: formData.shipping_region_id?.trim()
          ? formData.shipping_region_id.trim()
          : null,
        is_pallet_zone: formData.is_pallet_zone === true,
      };

      console.log("📝 Submitting producer data:", payload);

      // Use API routes instead of Server Actions for better error handling in production
      if (producer) {
        // Update existing producer
        const response = await fetch(`/api/admin/producers/${producer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Update failed:", errorData);
          const msg =
            typeof errorData.message === "string" && errorData.message.trim()
              ? errorData.message
              : typeof errorData.error === "string"
                ? errorData.error
                : "Failed to update producer";
          throw new Error(msg);
        }

        const result = await response.json();
        console.log("✅ Producer updated:", result.producer);
      } else {
        // Create new producer
        const response = await fetch("/api/admin/producers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Create failed:", errorData);
          throw new Error(errorData.error || "Failed to create producer");
        }

        const result = await response.json();
        console.log("✅ Producer created:", result.producer);
      }

      router.push("/admin/producers");
      router.refresh();
    } catch (err) {
      console.error("❌ Producer creation error:", err);
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
    if (
      [
        "address_street",
        "address_city",
        "address_postcode",
        "country_code",
      ].includes(field)
    ) {
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
          "User-Agent": "PACT-Wines-Admin/1.0",
        },
      });

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const results = await response.json();

      if (!results || results.length === 0) {
        throw new Error(
          "Address not found. Please check the address and try again.",
        );
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
      setError(
        err instanceof Error ? err.message : "Failed to geocode address",
      );
      console.error("Geocoding error:", err);
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {producer ? "Edit Producer" : "Add Producer"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
          {producer
            ? "Update producer information"
            : "Create a new wine producer"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive" className="border-red-200 dark:border-red-900/50">
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        {producer && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-gray-50 dark:bg-zinc-900/70">
            <div>
              <Label htmlFor="is_live" className="text-sm font-medium text-gray-900 dark:text-zinc-100">Live på webbsidan</Label>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                När av är producenten och dess viner dolda i shop, sök och samlingar.
              </p>
            </div>
            <Switch
              id="is_live"
              checked={formData.is_live ?? true}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_live: !!checked }))
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-gray-50 dark:bg-zinc-900/70">
          <div>
            <Label htmlFor="boost_active" className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              Boost Active
            </Label>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              When enabled, PACT Points redeemed against this producer&apos;s wines are worth 2× at checkout.
            </p>
          </div>
          <Switch
            id="boost_active"
            checked={formData.boost_active === true}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, boost_active: !!checked }))
            }
          />
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-zinc-300">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-700 dark:text-zinc-300">Country *</Label>
              <Select
                value={formData.country_code || undefined}
                onValueChange={(v) => {
                  handleChange("country_code", v);
                  setFormData((prev) => ({ ...prev, region: "" }));
                }}
                required
              >
                <SelectTrigger id="country" className="w-full border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-gray-700 dark:text-zinc-300">Latitude *</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={formData.lat}
                  onChange={(e) =>
                    handleChange("lat", parseFloat(e.target.value) || 0)
                  }
                  required
                  className={
                    geocodeSuccess
                      ? "border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lon" className="text-gray-700 dark:text-zinc-300">Longitude *</Label>
                <Input
                  id="lon"
                  type="number"
                  step="0.0001"
                  value={formData.lon}
                  onChange={(e) =>
                    handleChange("lon", parseFloat(e.target.value) || 0)
                  }
                  required
                  className={
                    geocodeSuccess
                      ? "border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region" className="text-gray-700 dark:text-zinc-300">Region *</Label>
                <Select
                  value={formData.region || undefined}
                  onValueChange={(v) => handleChange("region", v)}
                  required
                >
                  <SelectTrigger id="region" className="w-full border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !formData.address_city}
                variant="outline"
                className="w-auto rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
              >
                {geocoding ? "Geocoding..." : "🌍 Get Coordinates from Address"}
              </Button>
              {geocodeSuccess && (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  ✅ Coordinates updated successfully!
                </span>
              )}
            </div>

            {formData.address_city && (
              <div className="text-xs text-gray-500 dark:text-zinc-400 p-2 bg-gray-50 dark:bg-zinc-900/70 rounded-lg border border-gray-200 dark:border-zinc-800">
                📍 Will geocode:{" "}
                {[
                  formData.address_street,
                  formData.address_city,
                  formData.address_postcode,
                  formData.country_code,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_street" className="text-gray-700 dark:text-zinc-300">Street Address *</Label>
            <Input
              id="address_street"
              value={formData.address_street}
              onChange={(e) => handleChange("address_street", e.target.value)}
              required
              className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city" className="text-gray-700 dark:text-zinc-300">City *</Label>
              <Input
                id="address_city"
                value={formData.address_city}
                onChange={(e) => handleChange("address_city", e.target.value)}
                required
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_postcode" className="text-gray-700 dark:text-zinc-300">Postal Code *</Label>
              <Input
                id="address_postcode"
                value={formData.address_postcode}
                onChange={(e) =>
                  handleChange("address_postcode", e.target.value)
                }
                required
                className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description" className="text-gray-700 dark:text-zinc-300">Description</Label>
            <Textarea
              id="short_description"
              value={formData.short_description}
              onChange={(e) =>
                handleChange("short_description", e.target.value)
              }
              rows={3}
              className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_image_path" className="text-gray-700 dark:text-zinc-300">Logo Image URL</Label>
            <Input
              id="logo_image_path"
              type="url"
              value={formData.logo_image_path}
              onChange={(e) => handleChange("logo_image_path", e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping_region_id" className="text-gray-700 dark:text-zinc-300">
              Shipping region
            </Label>
            <Select
              value={formData.shipping_region_id || "__none__"}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  shipping_region_id: v === "__none__" ? "" : v,
                }))
              }
            >
              <SelectTrigger
                id="shipping_region_id"
                className="w-full border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              >
                <SelectValue placeholder="Not assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not assigned</SelectItem>
                {shippingRegions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.country_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Optional. Groups this producer for pallet automation (Phase 2.1).
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-gray-50 dark:bg-zinc-900/70">
            <div>
              <Label htmlFor="is_pallet_zone" className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                Can handle full pallet
              </Label>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                This producer can physically receive and ship a full pallet. The producer with the most orders becomes the pickup point.
              </p>
            </div>
            <Switch
              id="is_pallet_zone"
              checked={formData.is_pallet_zone === true}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_pallet_zone: !!checked }))
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
            >
              {loading
                ? "Saving..."
                : producer
                  ? "Update Producer"
                  : "Create Producer"}
            </Button>
          </div>
        </form>
    </div>
  );
}
