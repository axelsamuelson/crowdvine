"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import {
  loadPalletPhysicalSettingsAction,
  savePalletPhysicalSettingsAction,
} from "@/lib/actions/pallet-physical-settings";
import { DEFAULT_MIN_BOTTLES_TO_COMPLETE } from "@/lib/pallet-ship-progress";

export default function PalletPhysicalSettingsPage() {
  const [triggerShare, setTriggerShare] = useState(0.8);
  const [weightLimit, setWeightLimit] = useState<string>("");
  const [kgPerBottle, setKgPerBottle] = useState(1.4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadPalletPhysicalSettingsAction()
      .then((s) => {
        setTriggerShare(s.pickupSelectionTriggerShare);
        setWeightLimit(
          s.weightLimitKg == null ? "" : String(s.weightLimitKg),
        );
        setKgPerBottle(s.kgPerBottle);
      })
      .catch(() => {
        setMessage({ type: "error", text: "Could not load settings." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const trimmed = weightLimit.trim();
      await savePalletPhysicalSettingsAction({
        pickupSelectionTriggerShare: triggerShare,
        weightLimitKg: trimmed === "" ? null : Number(trimmed),
        kgPerBottle,
      });
      setMessage({ type: "success", text: "Settings saved." });
    } catch {
      setMessage({ type: "error", text: "Could not save settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Link
        href="/admin/pallets?tab=pact"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to pallets
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Pallet becomes-physical settings</CardTitle>
          <CardDescription>
            Trigger for choosing pickup location, and optional weight limit.
            Pallet minimum stays at {DEFAULT_MIN_BOTTLES_TO_COMPLETE} bottles
            (per-pallet override via min_bottles_to_complete).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="trigger_share">
                  Pickup selection trigger (share of minimum)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Default 0.8 = notify admin at 80% of{" "}
                  {DEFAULT_MIN_BOTTLES_TO_COMPLETE} bottles (
                  {Math.ceil(DEFAULT_MIN_BOTTLES_TO_COMPLETE * triggerShare)}{" "}
                  bottles with current value).
                </p>
                <Input
                  id="trigger_share"
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.05}
                  value={triggerShare}
                  onChange={(e) => setTriggerShare(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kg_per_bottle">Kg per bottle (estimate)</Label>
                <Input
                  id="kg_per_bottle"
                  type="number"
                  min={0.01}
                  step={0.1}
                  value={kgPerBottle}
                  onChange={(e) => setKgPerBottle(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight_limit">
                  Weight limit (kg, empty = no check)
                </Label>
                <Input
                  id="weight_limit"
                  type="number"
                  min={0}
                  step={1}
                  value={weightLimit}
                  placeholder="No limit"
                  onChange={(e) => setWeightLimit(e.target.value)}
                />
              </div>

              {message ? (
                <p
                  className={
                    message.type === "success"
                      ? "text-sm text-emerald-600"
                      : "text-sm text-red-600"
                  }
                >
                  {message.text}
                </p>
              ) : null}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
