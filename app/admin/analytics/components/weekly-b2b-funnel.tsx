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

export function WeeklyB2bFunnel({
  weeks,
  since,
}: {
  weeks: B2bWeeklyFunnelRow[];
  since: string;
}) {
  const latest = weeks[weeks.length - 1];

  if (!latest) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Ingen B2B-funnel-data ännu.
      </p>
    );
  }

  const steps = STEPS.map((s) => ({
    key: s.key,
    label: s.conversion ? `${s.label} ★` : s.label,
    value: Number(latest[s.key]) || 0,
  }));

  return (
    <div className="space-y-4">
      <FunnelBar
        title="B2B-funnel (Dirty Wine)"
        subtitle={`Från ${since} · konvertering = förfrågan skickad · aktuell vecka från ${formatWeek(latest.week_start)}`}
        steps={steps}
      />

      {weeks.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-800">
                <th className="py-1.5 pr-2 font-medium">Vecka</th>
                {STEPS.map((s) => (
                  <th
                    key={s.key}
                    className="py-1.5 px-1 font-medium text-right"
                    title={s.conversion ? "Konvertering" : undefined}
                  >
                    {s.label}
                    {s.conversion ? " ★" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => (
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
                      className="py-1.5 px-1 text-right tabular-nums text-gray-900 dark:text-zinc-100"
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
