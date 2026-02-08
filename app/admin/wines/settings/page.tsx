"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { getWineFewLeftThreshold, updateWineFewLeftThreshold } from "@/lib/actions/wine-settings";
import { ArrowLeft } from "lucide-react";

export default function WineSettingsPage() {
  const [fewLeftThreshold, setFewLeftThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getWineFewLeftThreshold()
      .then(setFewLeftThreshold)
      .catch(() => setFewLeftThreshold(5))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateWineFewLeftThreshold(fewLeftThreshold);
      setMessage({ type: "success", text: "Inställningar sparade." });
    } catch {
      setMessage({ type: "error", text: "Kunde inte spara." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/wines"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Tillbaka till viner
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wine Settings</CardTitle>
          <CardDescription>
            Inställningar för vinvisning, bland annat lagerbadges på dirtywine.se.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Laddar…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="few_left_threshold">
                  Few left threshold
                </Label>
                <p className="text-sm text-muted-foreground">
                  When B2B stock is at or below this number, show &quot;Last X&quot; instead of &quot;In stock&quot;.
                </p>
                <Input
                  id="few_left_threshold"
                  type="number"
                  min={0}
                  max={999}
                  value={fewLeftThreshold}
                  onChange={(e) =>
                    setFewLeftThreshold(
                      Math.max(0, Math.min(999, parseInt(e.target.value, 10) || 0)),
                    )
                  }
                  className="w-24"
                />
              </div>

              {message && (
                <p
                  className={
                    message.type === "success"
                      ? "text-sm text-green-600"
                      : "text-sm text-red-600"
                  }
                >
                  {message.text}
                </p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Sparar…" : "Spara"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
