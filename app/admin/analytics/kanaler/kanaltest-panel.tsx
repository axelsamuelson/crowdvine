"use client";

import { useCallback, useEffect, useState } from "react";
import { formatSvNumber } from "@/lib/analytics/v2/labels";

type CostRow = {
  id: string;
  period_from: string;
  period_to: string;
  test_channel: string;
  utm_campaign: string | null;
  cost_sek: number;
  source: string | null;
  created_at: string;
};

const TEST_CHANNEL_LABELS: Record<string, string> = {
  meta_ads: "Meta-annonser",
  instagram_organic: "Instagram organiskt",
  instagram_no_utm: "Instagram utan UTM",
  organic_search: "Organisk sök",
};

/** Channels that never store a campaign (always NULL). */
const NO_CAMPAIGN_CHANNELS = new Set(["organic_search", "instagram_no_utm"]);

function costSourceLabelSv(source: string | null | undefined): string {
  if (!source) return "—";
  if (source === "manual") return "Manuell";
  return source;
}

const inputClass =
  "h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-white";

/**
 * Kanaltest tab (cd8aba77) — cost form (M7/K20) + notices.
 * Full funnel table lands with M3 aggregations in a follow-up PR.
 */
export function KanaltestPanel() {
  const [rows, setRows] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    period_from: "2026-11-16",
    period_to: "2026-12-14",
    test_channel: "meta_ads",
    utm_campaign: "",
    cost_sek: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/v2/channel-costs");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { rows?: CostRow[] };
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta kostnader");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const campaign = NO_CAMPAIGN_CHANNELS.has(form.test_channel)
        ? null
        : form.utm_campaign.trim() || null;
      const res = await fetch("/api/admin/analytics/v2/channel-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_from: form.period_from,
          period_to: form.period_to,
          test_channel: form.test_channel,
          utm_campaign: campaign,
          cost_sek: Number(form.cost_sek),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setForm((f) => ({ ...f, cost_sek: "", utm_campaign: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  const campaignDisabled = NO_CAMPAIGN_CHANNELS.has(form.test_channel);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">
          Utvärdering 14 december: jämför antal, inte andelar, när underlaget är
          under 30.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>
            Stockholm kan inte mätas separat eftersom regionen inte sparas.
            Siffrorna gäller hela Sverige.
          </li>
          <li>
            Kostnad per besök, varukorg och köp visas bara när både kostnad och
            underlag finns. Annars står det &quot;saknas&quot;.
          </li>
          <li>
            Hela kedjan per kanal, från besök till köp, kommer i en senare
            uppdatering.
          </li>
        </ul>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-medium text-gray-900 dark:text-white">
          Lägg till kostnad
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Lägg in kostnaderna för kanaltestet för hand. Kostnader från Meta
          hämtas inte automatiskt än.
        </p>
        <form
          onSubmit={onSubmit}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
            Från
            <input
              className={inputClass}
              type="date"
              lang="sv-SE"
              required
              value={form.period_from}
              onChange={(e) =>
                setForm((f) => ({ ...f, period_from: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
            Till
            <input
              className={inputClass}
              type="date"
              lang="sv-SE"
              required
              value={form.period_to}
              onChange={(e) =>
                setForm((f) => ({ ...f, period_to: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
            Testkanal
            <select
              className={inputClass}
              value={form.test_channel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  test_channel: e.target.value,
                  utm_campaign: NO_CAMPAIGN_CHANNELS.has(e.target.value)
                    ? ""
                    : f.utm_campaign,
                }))
              }
            >
              {Object.entries(TEST_CHANNEL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label
            className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400"
            title="utm_campaign"
          >
            Kampanj
            <input
              className={inputClass}
              title="utm_campaign"
              value={campaignDisabled ? "" : form.utm_campaign}
              disabled={campaignDisabled}
              placeholder={campaignDisabled ? "(ingen)" : undefined}
              onChange={(e) =>
                setForm((f) => ({ ...f, utm_campaign: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
            Kostnad (kr)
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              required
              value={form.cost_sek}
              onChange={(e) =>
                setForm((f) => ({ ...f, cost_sek: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
            Källa
            <input
              className={`${inputClass} opacity-70`}
              value="Manuell"
              readOnly
              disabled
              aria-readonly="true"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="h-9 rounded-md bg-gray-900 px-4 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {saving ? "Sparar…" : "Spara kostnad"}
            </button>
          </div>
        </form>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium text-gray-900 dark:text-white">
          Sparade kostnader
        </h2>
        {loading ? (
          <div className="admin-skel h-24 rounded-xl" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kostnad saknas
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1F1F23]">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">Period</th>
                  <th className="px-3 py-2">Kanal</th>
                  <th className="px-3 py-2">Kampanj</th>
                  <th className="px-3 py-2 text-right">Kostnad</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Källa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 dark:border-zinc-800"
                  >
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {r.period_from} – {r.period_to}
                    </td>
                    <td className="px-3 py-2">
                      {TEST_CHANNEL_LABELS[r.test_channel] ?? r.test_channel}
                    </td>
                    <td className="px-3 py-2">
                      {r.utm_campaign || "(ingen)"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatSvNumber(Number(r.cost_sek))} kr
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      {costSourceLabelSv(r.source)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
