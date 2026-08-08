"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stockholmTodayDateKey } from "@/lib/analytics/stockholm-time";

const CATEGORIES = [
  { value: "seo", label: "SEO" },
  { value: "tiktok", label: "TikTok" },
  { value: "b2b", label: "B2B" },
  { value: "product", label: "Product" },
  { value: "other", label: "Other" },
] as const;

type Annotation = {
  id: string;
  date: string;
  label: string;
  category: string;
  created_at: string;
};

export function AnnotationCreateForm({
  initialAnnotations = [],
}: {
  initialAnnotations?: Annotation[];
}) {
  const [date, setDate] = useState(() => stockholmTodayDateKey());
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<string>("seo");
  const [rows, setRows] = useState<Annotation[]>(initialAnnotations);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/analytics/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, label, category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setRows((prev) => [json.annotation, ...prev]);
      setLabel("");
      setStatus("Annotation saved — it will appear on the Trafik chart.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-[#1F1F23]">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Trafik annotations
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
          Mark campaign or SEO launches on the Trafik chart (vertical markers).
        </p>
      </div>
      <form onSubmit={onSubmit} className="p-4 space-y-4 max-w-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ann-date">Date</Label>
            <Input
              id="ann-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ann-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ann-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-label">Label</Label>
          <Input
            id="ann-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. TikTok launch — Languedoc"
            required
            maxLength={200}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !label.trim()}>
            {saving ? "Saving…" : "Add annotation"}
          </Button>
          {status && (
            <p className="text-xs text-gray-500 dark:text-zinc-400">{status}</p>
          )}
        </div>
      </form>
      {rows.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-[#1F1F23]">
          <ul className="space-y-1.5 text-sm">
            {rows.slice(0, 20).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-700 dark:text-zinc-300"
              >
                <span className="font-mono text-xs text-gray-500">
                  {String(r.date).slice(0, 10)}
                </span>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {r.category}
                </span>
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
