"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

type ProducerStep = 1 | 2 | 3;

interface ProducerFormData {
  name: string;
  country_code: string;
  region: string;
  address_street: string;
  address_city: string;
  address_postcode: string;
  lat: number;
  lon: number;
  short_description: string;
  logo_image_path: string;
}

type CountryOption = { code: string; name: string };
type RegionOption = { value: string; label: string };

const defaultProducerData: ProducerFormData = {
  name: "",
  country_code: "",
  region: "",
  address_street: "",
  address_city: "",
  address_postcode: "",
  lat: 0,
  lon: 0,
  short_description: "",
  logo_image_path: "",
};

interface ProducerSetupSectionProps {
  /** When true, used below welcome block; less top padding. */
  embedded?: boolean;
}

export function ProducerSetupSection({ embedded }: ProducerSetupSectionProps) {
  const [step, setStep] = useState<ProducerStep>(1);
  const [data, setData] = useState<ProducerFormData>(defaultProducerData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [producerRes, countriesRes] = await Promise.all([
          fetch("/api/producer/producer"),
          fetch("/api/countries"),
        ]);
        if (producerRes.ok) {
          const { producer } = await producerRes.json();
          if (producer) {
            setData({
              name: producer.name ?? "",
              country_code: producer.country_code ?? "",
              region: producer.region ?? "",
              address_street: producer.address_street ?? "",
              address_city: producer.address_city ?? "",
              address_postcode: producer.address_postcode ?? "",
              lat: Number(producer.lat) || 0,
              lon: Number(producer.lon) || 0,
              short_description: producer.short_description ?? "",
              logo_image_path: producer.logo_image_path ?? "",
            });
          }
        }
        if (countriesRes.ok) {
          const json = await countriesRes.json();
          setCountries(json.countries ?? []);
        }
      } catch (e) {
        console.error("Producer setup load error:", e);
        setError("Could not load producer data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!data.country_code) {
      setRegions([]);
      return;
    }
    const url = `/api/regions?country_code=${encodeURIComponent(data.country_code)}`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => setRegions(json.regions ?? []))
      .catch(() => setRegions([]));
  }, [data.country_code]);

  const update = (updates: Partial<ProducerFormData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    if ("country_code" in updates) {
      setData((prev) => ({ ...prev, region: "" }));
    }
  };

  const canProceedFrom1 =
    data.name.trim().length > 0 &&
    data.country_code.length > 0 &&
    data.region.length > 0;

  const goNext = () => {
    if (step === 1 && canProceedFrom1) setStep(2);
    if (step === 2) setStep(3);
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSaveAndFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/producer/producer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save");
        return;
      }
      setSaveDone(true);
    } catch (e) {
      console.error("Producer save error:", e);
      setError("Failed to save producer details.");
    } finally {
      setSaving(false);
    }
  };

  const sectionClass = embedded
    ? "relative pt-4 pb-12 px-0"
    : "relative py-24 px-6";

  if (loading) {
    return (
      <div className={sectionClass}>
        <div className="max-w-md mx-auto text-center text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (saveDone) {
    return (
      <div className={sectionClass}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md mx-auto text-center"
        >
          <p className="text-muted-foreground mb-6">
            Your producer profile has been saved.
          </p>
          <Button
            asChild
            className="bg-black text-white hover:bg-black/90 hover:text-white"
          >
            <a href="/">Go to platform</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={sectionClass}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Set up your producer profile
          </h2>
          <p className="text-muted-foreground text-sm">
            Part {step} of 3 — complete the fields below, then continue.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4 text-center">{error}</p>
        )}

        <div className="space-y-4">
          {/* Part 1: Name, Country, Region */}
          {step >= 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producer-name">Producer / winery name *</Label>
                <Input
                  id="producer-name"
                  type="text"
                  placeholder="Your winery name"
                  value={data.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="producer-country">Country *</Label>
                <Select
                  value={data.country_code || undefined}
                  onValueChange={(v) => update({ country_code: v })}
                >
                  <SelectTrigger id="producer-country" className="bg-background">
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
              <div className="space-y-2">
                <Label htmlFor="producer-region">Region *</Label>
                <Select
                  value={data.region || undefined}
                  onValueChange={(v) => update({ region: v })}
                >
                  <SelectTrigger id="producer-region" className="bg-background">
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
              {step === 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={goNext}
                  disabled={!canProceedFrom1}
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {/* Part 2: Address */}
          {step >= 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producer-street">Street address</Label>
                <Input
                  id="producer-street"
                  type="text"
                  placeholder="Street and number"
                  value={data.address_street}
                  onChange={(e) => update({ address_street: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="producer-city">City</Label>
                  <Input
                    id="producer-city"
                    type="text"
                    placeholder="City"
                    value={data.address_city}
                    onChange={(e) => update({ address_city: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="producer-postcode">Postal code</Label>
                  <Input
                    id="producer-postcode"
                    type="text"
                    placeholder="Postcode"
                    value={data.address_postcode}
                    onChange={(e) =>
                      update({ address_postcode: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="producer-lat">Latitude</Label>
                  <Input
                    id="producer-lat"
                    type="number"
                    step="0.0001"
                    placeholder="0"
                    value={data.lat || ""}
                    onChange={(e) =>
                      update({ lat: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="producer-lon">Longitude</Label>
                  <Input
                    id="producer-lon"
                    type="number"
                    step="0.0001"
                    placeholder="0"
                    value={data.lon || ""}
                    onChange={(e) =>
                      update({ lon: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-background"
                  />
                </div>
              </div>
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={goNext}
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {/* Part 3: Description & logo */}
          {step >= 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producer-desc">Short description</Label>
                <Textarea
                  id="producer-desc"
                  placeholder="A few words about your winery"
                  value={data.short_description}
                  onChange={(e) =>
                    update({ short_description: e.target.value })
                  }
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="producer-logo">Logo image URL</Label>
                <Input
                  id="producer-logo"
                  type="url"
                  placeholder="https://…"
                  value={data.logo_image_path}
                  onChange={(e) => update({ logo_image_path: e.target.value })}
                  className="bg-background"
                />
              </div>
              <Button
                type="button"
                className="w-full bg-black text-white hover:bg-black/90 hover:text-white"
                onClick={handleSaveAndFinish}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save and go to platform"}
              </Button>
            </div>
          )}
        </div>

        {step >= 2 && (
          <button
            type="button"
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            onClick={goBack}
          >
            Back
          </button>
        )}
      </motion.div>
    </div>
  );
}
