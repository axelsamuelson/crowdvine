"use client";

import { Suspense, useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReleasesData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  annotations: Array<{
    id: string;
    date: string;
    occurred_at: string | null;
    label: string;
    category: string;
    site: string | null;
    url: string | null;
    source: string | null;
    pr_number: number | null;
  }>;
  error: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  release: "Release",
  campaign: "Kampanj",
  kampanj: "Kampanj",
  seo: "SEO",
  incident: "Incident",
  other: "Övrigt",
  product: "Release",
  tiktok: "Kampanj",
  b2b: "Övrigt",
};

/** Avoid «PR269 — PR269 — …» when label already includes the PR number. */
function annotationTitle(
  label: string,
  prNumber: number | null | undefined,
): string {
  const trimmed = label.trim();
  if (!prNumber) return trimmed;
  const re = new RegExp(`^PR\\s*${prNumber}\\s*[—–-]\\s*`, "i");
  if (re.test(trimmed)) return trimmed;
  if (new RegExp(`^PR\\s*${prNumber}\\b`, "i").test(trimmed)) return trimmed;
  return `PR${prNumber} — ${trimmed}`;
}

function formatDateYmd(raw: string | null | undefined): string {
  if (!raw) return "—";
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(raw).slice(0, 10);
}

export default function ReleaserPage() {
  return (
    <AnalyticsPageShell
      title="Releaser och anteckningar"
      subtitle="Vad ändrades när, och vilken data ska jämföras före och efter?"
    >
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<ReleasesData> endpoint="/api/admin/analytics/v2/releases">
          {(data) => <ReleasesBody data={data} />}
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}

function ReleasesBody({ data }: { data: ReleasesData }) {
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("release");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/analytics/v2/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, label, category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kunde inte spara");
      setMessage("Anteckningen är sparad och syns i graferna.");
      setLabel("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await fetch(`/api/admin/analytics/v2/releases?id=${deleteId}`, {
      method: "DELETE",
    });
    setDeleteId(null);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {data.error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100">
          {data.error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => window.location.reload()}
          >
            Försök igen
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold">Lägg till anteckning</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            className="h-9 rounded-md border border-gray-200 px-2 text-sm dark:border-[#1F1F23] dark:bg-[#0F0F12]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Datum"
          />
          <select
            className="h-9 rounded-md border border-gray-200 px-2 text-sm dark:border-[#1F1F23] dark:bg-[#0F0F12]"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Kategori"
          >
            <option value="release">Release</option>
            <option value="kampanj">Kampanj</option>
            <option value="seo">SEO</option>
            <option value="incident">Incident</option>
            <option value="other">Övrigt</option>
          </select>
          <input
            type="text"
            placeholder="t.ex. Ny kassa live"
            className="h-9 min-w-[200px] flex-1 rounded-md border border-gray-200 px-2 text-sm dark:border-[#1F1F23] dark:bg-[#0F0F12]"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-label="Titel"
          />
          <Button type="button" onClick={save} disabled={saving || !date || !label}>
            {saving ? "Sparar …" : "Lägg till anteckning"}
          </Button>
        </div>
        {message ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="mb-3 text-lg font-bold">Lista</h2>
        <ul className="space-y-2 text-sm">
          {data.annotations.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-2 border-t border-gray-100 py-2 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  <span className="tabular-nums font-mono text-xs text-gray-500">
                    {formatDateYmd(a.date)}
                  </span>
                  {" · "}
                  {annotationTitle(a.label, a.pr_number)}
                </div>
                <div className="text-xs text-gray-500">
                  {CATEGORY_LABELS[a.category] || a.category}
                  {a.site
                    ? ` · ${a.site === "pact" ? "PACT" : a.site === "dirtywine" ? "Dirty Wine" : a.site}`
                    : ""}
                  {a.source
                    ? ` · ${a.source === "manual" ? "Manuell" : a.source === "backfill" ? "Bakåtfylld" : "Automatisk"}`
                    : ""}
                </div>
                {a.url ? (
                  <a
                    href={a.url}
                    className="text-xs underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Öppna länk
                  </a>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-gray-500"
                    aria-label="Åtgärder"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setDeleteId(a.id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </section>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort anteckningen?</AlertDialogTitle>
            <AlertDialogDescription>
              Anteckningen försvinner från listan och från graferna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Ta bort</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
