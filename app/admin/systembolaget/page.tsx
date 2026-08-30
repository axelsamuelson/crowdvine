"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SyncStatus = {
  totalProducts: number;
  availableWines: number;
  curatedCount: number;
  lastSyncedAt: string | null;
};

type SearchHit = {
  product_number: string;
  name_bold: string | null;
  name_thin: string | null;
  producer_name: string | null;
  category_level_2: string | null;
  country: string | null;
  price: number | null;
  vintage: number | null;
  assortment_text: string | null;
  is_available: boolean | null;
};

type CuratedRow = {
  id: number;
  product_number: string;
  verdict: "recommended" | "avoid";
  category: string;
  editorial_note_sv: string;
  editorial_note_en: string | null;
  sort_order: number;
  is_published: boolean;
  unavailable: boolean;
  product: {
    name_bold: string | null;
    name_thin: string | null;
    producer_name: string | null;
    price: number | null;
    is_available: boolean | null;
  } | null;
};

type CurateForm = {
  product_number: string;
  product_label: string;
  verdict: "recommended" | "avoid";
  category: "red" | "white" | "orange" | "sparkling" | "rose" | "budget";
  editorial_note_sv: string;
  editorial_note_en: string;
  sort_order: string;
  is_published: boolean;
};

const emptyForm = (): CurateForm => ({
  product_number: "",
  product_label: "",
  verdict: "recommended",
  category: "red",
  editorial_note_sv: "",
  editorial_note_en: "",
  sort_order: "100",
  is_published: false,
});

function formatSynced(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("sv-SE");
}

export default function SystembolagetAdminPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [curated, setCurated] = useState<CuratedRow[]>([]);
  const [form, setForm] = useState<CurateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/admin/systembolaget/status");
    if (!res.ok) {
      toast.error("Could not load sync status");
      return;
    }
    setStatus((await res.json()) as SyncStatus);
  }, []);

  const loadCurated = useCallback(async () => {
    const res = await fetch("/api/admin/systembolaget/curated");
    if (!res.ok) {
      toast.error("Could not load curated list");
      return;
    }
    const data = (await res.json()) as { rows: CuratedRow[] };
    setCurated(data.rows ?? []);
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadCurated();
  }, [loadStatus, loadCurated]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/systembolaget/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: SearchHit[] };
        setHits(data.results ?? []);
      } catch {
        toast.error("Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CuratedRow[]>();
    for (const row of curated) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [curated]);

  async function runSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/systembolaget/sync", {
        method: "POST",
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : typeof data === "object" &&
                data &&
                "reason" in data
              ? String((data as { reason: unknown }).reason)
              : "Sync failed";
        toast.error(msg);
        return;
      }
      const inserted =
        typeof data === "object" &&
        data &&
        "inserted" in data
          ? Number((data as { inserted: unknown }).inserted)
          : 0;
      toast.success(`Sync done — ${inserted} wines inserted`);
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  function selectHit(hit: SearchHit) {
    const label = [
      hit.producer_name,
      [hit.name_bold, hit.name_thin].filter(Boolean).join(" "),
      hit.product_number,
    ]
      .filter(Boolean)
      .join(" — ");
    setForm((prev) => ({
      ...prev,
      product_number: hit.product_number,
      product_label: label,
    }));
  }

  async function saveCurated() {
    if (!form.product_number || !form.editorial_note_sv.trim()) {
      toast.error("Product and Swedish editorial note are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/systembolaget/curated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_number: form.product_number,
          verdict: form.verdict,
          category: form.category,
          editorial_note_sv: form.editorial_note_sv.trim(),
          editorial_note_en: form.editorial_note_en.trim() || null,
          sort_order: Number.parseInt(form.sort_order, 10) || 100,
          is_published: form.is_published,
        }),
      });
      if (!res.ok) {
        const data: unknown = await res.json();
        const msg =
          typeof data === "object" &&
          data &&
          "error" in data
            ? JSON.stringify((data as { error: unknown }).error)
            : "Save failed";
        toast.error(msg);
        return;
      }
      toast.success("Curated entry saved");
      setForm(emptyForm());
      await loadCurated();
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(row: CuratedRow) {
    const res = await fetch(`/api/admin/systembolaget/curated/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !row.is_published }),
    });
    if (!res.ok) {
      toast.error("Could not update publish state");
      return;
    }
    await loadCurated();
  }

  async function removeCurated(row: CuratedRow) {
    if (!window.confirm(`Remove curated entry ${row.product_number}?`)) return;
    const res = await fetch(`/api/admin/systembolaget/curated/${row.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    await loadCurated();
    await loadStatus();
  }

  return (
    <div className="space-y-10 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Systembolaget</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly assortment mirror + editorial curation for guide pages.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Sync status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Last synced</div>
            <div className="mt-1 font-medium">
              {formatSynced(status?.lastSyncedAt ?? null)}
            </div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Total products</div>
            <div className="mt-1 font-medium">
              {status?.totalProducts ?? "—"}
            </div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Available wines</div>
            <div className="mt-1 font-medium">
              {status?.availableWines ?? "—"}
            </div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Curated rows</div>
            <div className="mt-1 font-medium">
              {status?.curatedCount ?? "—"}
            </div>
          </div>
        </div>
        <Button onClick={() => void runSync()} disabled={syncing}>
          {syncing ? "Syncing… (up to 5 min)" : "Run sync now"}
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Add to curation</h2>
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="sb-search">Search producer or wine name</Label>
          <Input
            id="sb-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Occhipinti, Colombaia…"
          />
          {searching ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="max-h-56 overflow-auto rounded border border-border text-sm divide-y">
              {hits.map((hit) => (
                <li key={hit.product_number}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => selectHit(hit)}
                  >
                    <span className="font-medium">
                      {hit.producer_name ?? "—"} —{" "}
                      {[hit.name_bold, hit.name_thin].filter(Boolean).join(" ")}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {hit.product_number}
                      {hit.price != null ? ` · ${hit.price} kr` : ""}
                      {hit.category_level_2 ? ` · ${hit.category_level_2}` : ""}
                      {hit.is_available === false ? " · unavailable" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {form.product_number ? (
          <div className="grid gap-3 max-w-xl">
            <p className="text-sm">
              Selected: <strong>{form.product_label}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="verdict">Verdict</Label>
                <select
                  id="verdict"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  value={form.verdict}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      verdict: e.target.value as CurateForm["verdict"],
                    }))
                  }
                >
                  <option value="recommended">recommended</option>
                  <option value="avoid">avoid</option>
                </select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      category: e.target.value as CurateForm["category"],
                    }))
                  }
                >
                  <option value="red">red</option>
                  <option value="white">white</option>
                  <option value="orange">orange</option>
                  <option value="sparkling">sparkling</option>
                  <option value="rose">rose</option>
                  <option value="budget">budget</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="note-sv">Editorial note (SV)</Label>
              <textarea
                id="note-sv"
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[88px]"
                value={form.editorial_note_sv}
                onChange={(e) =>
                  setForm((p) => ({ ...p, editorial_note_sv: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="note-en">Editorial note (EN)</Label>
              <textarea
                id="note-en"
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[88px]"
                value={form.editorial_note_en}
                onChange={(e) =>
                  setForm((p) => ({ ...p, editorial_note_en: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label htmlFor="sort">Sort order</Label>
                <Input
                  id="sort"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sort_order: e.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      is_published: e.target.checked,
                    }))
                  }
                />
                Published
              </label>
            </div>
            <Button onClick={() => void saveCurated()} disabled={saving}>
              {saving ? "Saving…" : "Save curated entry"}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Curated entries</h2>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing curated yet.</p>
        ) : (
          grouped.map(([category, rows]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <ul className="divide-y rounded border border-border text-sm">
                {rows.map((row) => {
                  const title =
                    row.product
                      ? `${row.product.producer_name ?? "—"} — ${[
                          row.product.name_bold,
                          row.product.name_thin,
                        ]
                          .filter(Boolean)
                          .join(" ")}`
                      : row.product_number;
                  return (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-3 py-3"
                    >
                      <div>
                        <div className="font-medium">
                          {title}{" "}
                          {row.unavailable ? (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                              unavailable
                            </span>
                          ) : null}
                          {!row.is_published ? (
                            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                              draft
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.product_number} · {row.verdict} · sort{" "}
                          {row.sort_order}
                          {row.product?.price != null
                            ? ` · ${row.product.price} kr`
                            : ""}
                        </div>
                        <p className="mt-2 text-foreground/80">
                          {row.editorial_note_sv}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void togglePublished(row)}
                        >
                          {row.is_published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void removeCurated(row)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
