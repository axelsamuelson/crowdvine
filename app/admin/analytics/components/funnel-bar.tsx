"use client";

import { useMemo } from "react";

export type FunnelBarStep = {
  key: string;
  label: string;
  value: number;
};

function pct(from: number, to: number): string | null {
  if (from <= 0) return null;
  return `${Math.round((to / from) * 1000) / 10}%`;
}

export function FunnelBar({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle?: string;
  steps: FunnelBarStep[];
}) {
  const bars = useMemo(() => {
    return steps.map((s, i) => {
      const prev = i === 0 ? s.value : steps[i - 1].value;
      return {
        ...s,
        conversion: i === 0 ? null : pct(prev, s.value),
      };
    });
  }, [steps]);

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const cols =
    bars.length <= 4
      ? "grid-cols-4"
      : bars.length === 5
        ? "grid-cols-5"
        : "grid-cols-5 sm:grid-cols-6";

  if (bars.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-400">
        Ingen funnel-data ännu.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className={`grid ${cols} gap-2 sm:gap-3`}>
        {bars.map((bar) => (
          <div key={bar.key} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 text-center leading-tight">
              {bar.label}
            </span>
            <div className="w-full h-24 sm:h-28 flex items-end rounded-md bg-gray-50 dark:bg-zinc-900/50 px-1">
              <div
                className="w-full rounded-t bg-zinc-800 dark:bg-zinc-200 transition-all"
                style={{
                  height: `${Math.max(4, (bar.value / maxVal) * 100)}%`,
                }}
                title={String(bar.value)}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {bar.value}
            </span>
            {bar.conversion != null && (
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                {bar.conversion}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
