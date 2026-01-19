"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Producer = {
  id: string;
  name: string;
  region: string;
  country_code: string;
  address_street: string;
  address_city: string;
  address_postcode: string;
  short_description: string;
  logo_image_path: string;
};

export function ProducerProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producer, setProducer] = useState<Producer | null>(null);

  const [form, setForm] = useState({
    name: "",
    region: "",
    country_code: "",
    address_street: "",
    address_city: "",
    address_postcode: "",
    short_description: "",
    logo_image_path: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/producer/producer");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load producer");
        }
        const data = await res.json();
        const p: Producer = data.producer;
        setProducer(p);
        setForm({
          name: p.name || "",
          region: p.region || "",
          country_code: p.country_code || "",
          address_street: p.address_street || "",
          address_city: p.address_city || "",
          address_postcode: p.address_postcode || "",
          short_description: p.short_description || "",
          logo_image_path: p.logo_image_path || "",
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to load producer");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/producer/producer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const data = await res.json();
      setProducer(data.producer);
      toast.success("Producer profile updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    );
  }

  if (!producer) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Producer Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No producer is linked to this account yet. Ask an admin to link a
              producer to your user.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-light text-foreground">Producer Profile</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update your producer information shown across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_code">Country Code</Label>
              <Input
                id="country_code"
                placeholder="e.g. FR, IT, ES"
                value={form.country_code}
                onChange={(e) =>
                  setForm({ ...form, country_code: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_image_path">Logo Image Path / URL</Label>
              <Input
                id="logo_image_path"
                value={form.logo_image_path}
                onChange={(e) =>
                  setForm({ ...form, logo_image_path: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address_street">Street</Label>
              <Input
                id="address_street"
                value={form.address_street}
                onChange={(e) =>
                  setForm({ ...form, address_street: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_postcode">Postcode</Label>
              <Input
                id="address_postcode"
                value={form.address_postcode}
                onChange={(e) =>
                  setForm({ ...form, address_postcode: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address_city">City</Label>
              <Input
                id="address_city"
                value={form.address_city}
                onChange={(e) =>
                  setForm({ ...form, address_city: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Short Description</Label>
            <Textarea
              id="short_description"
              value={form.short_description}
              onChange={(e) =>
                setForm({ ...form, short_description: e.target.value })
              }
              rows={5}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


