"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Producer = {
  id: string;
  name: string;
  moq_min_bottles: number;
};

export function ProducerSettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producer, setProducer] = useState<Producer | null>(null);
  const [moq, setMoq] = useState<string>("0");

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
        const p = data.producer as Producer;
        setProducer(p);
        setMoq(
          p?.moq_min_bottles === null || p?.moq_min_bottles === undefined
            ? "0"
            : String(p.moq_min_bottles),
        );
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
      const parsed = Math.max(0, Math.floor(Number(moq || 0)));
      setSaving(true);
      const res = await fetch("/api/producer/producer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moq_min_bottles: parsed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const data = await res.json();
      setProducer(data.producer);
      setMoq(String(data.producer?.moq_min_bottles ?? parsed));
      toast.success("Settings updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 pt-top-spacing">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </div>
      </main>
    );
  }

  if (!producer) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Producer Settings
            </h1>
            <p className="text-gray-500">
              No producer is linked to this account yet. Ask an admin to link a
              producer to your user.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">
            Producer Settings
          </h1>
          <p className="text-gray-500">
            Configure rules for how your bottles contribute to pallet completion.
          </p>
        </div>

        <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
          <div className="text-sm font-medium text-gray-900">MOQ</div>
          <div className="mt-1 text-sm text-gray-500">
            Minimum bottles you must have in a pallet for your bottles to count
            toward pallet fill and completion.
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moq_min_bottles">Minimum bottles per pallet</Label>
              <Input
                id="moq_min_bottles"
                inputMode="numeric"
                className="no-spinner"
                type="number"
                min={0}
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
              />
              <div className="text-xs text-gray-500">
                Example: if you set 30 and you only have 20 bottles in a pallet,
                those 20 won’t be counted in the pallet total.
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={onSave}
              disabled={saving}
              className="bg-black hover:bg-black/90 text-white rounded-full"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

