"use client";

import type { WeeklyFunnelRow } from "@/lib/analytics/intent-sessions";
import { FunnelBar } from "./funnel-bar";

const STEPS: {
  key: keyof WeeklyFunnelRow;
  label: string;
}[] = [
  { key: "sessions", label: "Sessioner" },
  { key: "sessions_with_product_list_view", label: "PLP" },
  { key: "sessions_with_product_view", label: "Produktvy" },
  { key: "sessions_with_add_to_cart", label: "Varukorg" },
  { key: "sessions_with_checkout", label: "Checkout" },
  { key: "sessions_with_reservation", label: "Reservation" },
];

function formatWeek(weekStart: string): string {
  // week_start is already a Stockholm civil Monday (YYYY-MM-DD)
  const d = new Date(`${weekStart}T12:00:00.000Z`);
  return d.toLocaleDateString("sv-SE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

export function WeeklyIntentFunnel({ weeks }: { weeks: WeeklyFunnelRow[] }) {
  const latest = weeks[weeks.length - 1];

  if (!latest) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Ingen funnel-data ännu.
      </p>
    );
  }

  const steps = STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    value: Number(latest[s.key]) || 0,
  }));

  return (
    <div className="space-y-4">
      <FunnelBar
        title="Veckofunnel"
        subtitle={`Rena sessioner · senaste 8 veckorna · aktuell vecka från ${formatWeek(latest.week_start)}`}
        steps={steps}
      />

      {weeks.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-800">
                <th className="py-1.5 pr-2 font-medium">Vecka</th>
                {STEPS.map((s) => (
                  <th key={s.key} className="py-1.5 px-1 font-medium text-right">
                    {s.label}
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
