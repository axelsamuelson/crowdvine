"use client";

import Link from "next/link";
import { formatSvNumber } from "@/lib/analytics/v2/labels";
import { formatStockholmDateTime } from "@/lib/analytics/stockholm-time";

export type DataStatusProps = {
  beforeFilter: number;
  afterFilter: number;
  prerenderSuspect: number;
  lastRefreshAt: string | null;
  warnings?: string[];
  queryString?: string;
};

export function DataStatusLine({
  beforeFilter,
  afterFilter,
  prerenderSuspect,
  lastRefreshAt,
  warnings = [],
  queryString = "",
}: DataStatusProps) {
  const amber = warnings.length > 0;
  const href = queryString
    ? `/admin/analytics/datakvalitet?${queryString}`
    : "/admin/analytics/datakvalitet";

  return (
    <div
      className={
        amber
          ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100"
          : "text-xs text-gray-500 dark:text-gray-400"
      }
    >
      <Link href={href} className="hover:underline">
        Bottfilter på · {formatSvNumber(afterFilter)} rena sessioner av{" "}
        {formatSvNumber(beforeFilter)}
        {prerenderSuspect > 0
          ? ` · ${formatSvNumber(prerenderSuspect)} förhandsladdningar bortfiltrerade`
          : ""}
        {lastRefreshAt
          ? ` · Uppdaterad ${formatStockholmDateTime(lastRefreshAt)}`
          : " · Ej uppdaterad ännu"}
        {warnings.length > 0 ? ` · ${warnings.length} varning` : ""}
      </Link>
    </div>
  );
}
