"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ShippingRegionFormValues {
  id: string;
  name: string;
  country_code: string;
  description: string | null;
}

interface ShippingRegionFormProps {
  region?: ShippingRegionFormValues;
}

export default function ShippingRegionForm({ region }: ShippingRegionFormProps) {
  const router = useRouter();
  const [name, setName] = useState(region?.name ?? "");
  const [countryCode, setCountryCode] = useState(
    region?.country_code?.toUpperCase() ?? "FR",
  );
  const [description, setDescription] = useState(region?.description ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedName = name.trim();
    const code = countryCode.trim().toUpperCase();
    if (!trimmedName) {
      setError("Name is required");
      setLoading(false);
      return;
    }
    if (code.length !== 2) {
      setError("Country code must be exactly 2 characters");
      setLoading(false);
      return;
    }

    try {
      if (region) {
        const res = await fetch(`/api/admin/shipping-regions/${region.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            country_code: code,
            description: description.trim() || null,
          }),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error || "Failed to update region");
        }
      } else {
        const res = await fetch("/api/admin/shipping-regions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            country_code: code,
            description: description.trim() || null,
          }),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error || "Failed to create region");
        }
      }
      router.push("/admin/shipping-regions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {region ? "Edit shipping region" : "New shipping region"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
          {region
            ? "Update region details"
            : "Create a geographic grouping for pallet routing"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <Alert
            variant="destructive"
            className="border-red-200 dark:border-red-900/50"
          >
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="sr-name" className="text-gray-700 dark:text-zinc-300">
            Name *
          </Label>
          <Input
            id="sr-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="sr-country"
            className="text-gray-700 dark:text-zinc-300"
          >
            Country code *
          </Label>
          <Input
            id="sr-country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.slice(0, 2))}
            maxLength={2}
            required
            className="max-w-[120px] uppercase border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
          />
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            ISO 3166-1 alpha-2 (e.g. FR, SE). Defaults to FR for French producers.
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="sr-desc"
            className="text-gray-700 dark:text-zinc-300"
          >
            Description
          </Label>
          <Textarea
            id="sr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
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
            {loading ? "Saving…" : region ? "Save changes" : "Create region"}
          </Button>
        </div>
      </form>
    </div>
  );
}
