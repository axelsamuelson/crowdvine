"use client";

import { cn } from "@/lib/utils";
import type { AnalyticsSiteFilter } from "@/lib/analytics/analytics-site";

const OPTIONS: { value: AnalyticsSiteFilter; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "pact", label: "PACT" },
  { value: "dirtywine", label: "Dirty Wine" },
];

export function SiteSwitcher({
  value,
  onChange,
}: {
  value: AnalyticsSiteFilter;
  onChange: (next: AnalyticsSiteFilter) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 dark:border-zinc-700 p-0.5 bg-gray-50 dark:bg-zinc-900/50"
      role="group"
      aria-label="Site"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              active
                ? "bg-white dark:bg-[#1F1F23] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SiteBadge({ site }: { site: string | null | undefined }) {
  if (site !== "pact" && site !== "dirtywine") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        site === "pact"
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
      )}
    >
      {site === "pact" ? "PACT" : "DW"}
    </span>
  );
}
