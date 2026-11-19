"use client";

import { LOW_N_THRESHOLD } from "@/lib/analytics/v2/wilson";

/** Gray advisory above tables when at least one row is under the low-n threshold. */
export function LowNBanner({
  show,
  entity,
}: {
  show: boolean;
  /** Swedish noun: "vin" | "marknad" */
  entity: "vin" | "marknad";
}) {
  if (!show) return null;
  return (
    <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-zinc-900/60 dark:text-zinc-400">
      Få besök per {entity}, tolka försiktigt (under {LOW_N_THRESHOLD} besök).
    </p>
  );
}

export function lowNNumberClass(isLow: boolean): string {
  return isLow
    ? "text-gray-400 dark:text-zinc-500"
    : "text-gray-900 dark:text-zinc-100";
}
