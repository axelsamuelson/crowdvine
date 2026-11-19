"use client";

import type { B2bWeeklyFunnelRow } from "@/lib/analytics/b2b-funnel";
import { FunnelBar } from "./funnel-bar";

const STEPS: {
  key: keyof B2bWeeklyFunnelRow;
  label: string;
  conversion?: boolean;
}[] = [
  { key: "contact_clicked", label: "Kontakt" },
  { key: "inquiry_started", label: "Förfrågan startad" },
  { key: "inquiry_submitted", label: "Förfrågan skickad", conversion: true },
  { key: "tasting_or_quote", label: "Provning/offert" },
  { key: "first_orders", label: "Första order" },
  { key: "repeat_orders", label: "Återköp" },
];

function formatWeek(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00.000Z`);
  return d.toLocaleDateString("sv-SE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

function weekInRange(
  weekStart: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) return true;
  // week_start is Monday; include week if it overlaps [from, to]
  const start = weekStart;
  const endDate = new Date(`${weekStart}T12:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const end = endDate.toISOString().slice(0, 10);
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
}

function rowHasActivity(row: B2bWeeklyFunnelRow): boolean {
  return STEPS.some((s) => Number(row[s.key]) > 0);
}

export function WeeklyB2bFunnel({
  weeks,
  since,
  from,
  to,
}: {
  weeks: B2bWeeklyFunnelRow[];
  since: string;
  from?: string;
  to?: string;
}) {
  const inPeriod = weeks.filter((w) => weekInRange(w.week_start, from, to));
  const active = inPeriod.filter(rowHasActivity);
  const latest = [...inPeriod].reverse().find(rowHasActivity) ?? null;

  if (!latest || active.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Inga B2B-kontakter i perioden
      </p>
    );
  }

  const steps = STEPS.map((s) => ({
    key: s.key,
    label: s.conversion ? `${s.label} ★` : s.label,
    value: Number(latest[s.key]) || 0,
  }));

  const periodLabel =
    from && to ? `${from}–${to}` : `Från ${since}`;

  return (
    <div className="space-y-4">
      <FunnelBar
        title="B2B-tratt (Dirty Wine)"
        subtitle={`${periodLabel} · konvertering = förfrågan skickad · vecka från ${formatWeek(latest.week_start)}`}
        steps={steps}
      />

      {active.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 dark:border-zinc-800 dark:text-zinc-500">
                <th className="py-1.5 pr-2 font-medium">Vecka</th>
                {STEPS.map((s) => (
                  <th
                    key={s.key}
                    className="px-1 py-1.5 text-right font-medium"
                    title={s.conversion ? "Konvertering" : undefined}
                  >
                    {s.label}
                    {s.conversion ? " ★" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...active].reverse().map((w) => (
                <tr
                  key={w.week_start}
                  className="border-b border-gray-50 dark:border-zinc-900"
                >
                  <td className="py-1.5 pr-2 text-gray-700 dark:text-zinc-300">
                    {formatWeek(w.week_start)}
                  </td>
                  {STEPS.map((s) => (
                    <td
                      key={s.key}
                      className="px-1 py-1.5 text-right tabular-nums text-gray-900 dark:text-zinc-100"
                    >
                      {Number(w[s.key]) || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
