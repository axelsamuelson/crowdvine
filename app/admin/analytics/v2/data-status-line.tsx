"use client";

import Link from "next/link";
import { formatSvNumber } from "@/lib/analytics/v2/labels";
import { formatStockholmDateTime } from "@/lib/analytics/stockholm-time";

export type DataStatusProps = {
  beforeFilter: number;
  afterFilter: number;
  prerenderSuspect: number;
  geoBotSuspect?: number;
  lastRefreshAt: string | null;
  warnings?: string[];
  queryString?: string;
};

export function DataStatusLine({
  beforeFilter,
  afterFilter,
  prerenderSuspect,
  geoBotSuspect = 0,
  lastRefreshAt,
  warnings = [],
  queryString = "",
}: DataStatusProps) {
  const href = queryString
    ? `/admin/analytics/datakvalitet?${queryString}`
    : "/admin/analytics/datakvalitet";

  return (
    <div className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-zinc-900 dark:text-gray-400">
      <Link href={href} className="hover:underline">
        Bottfilter på · {formatSvNumber(afterFilter)} rena besök av{" "}
        {formatSvNumber(beforeFilter)}
        {prerenderSuspect > 0
          ? ` · ${formatSvNumber(prerenderSuspect)} förhandsladdningar borttagna`
          : ""}
        {` · ${formatSvNumber(geoBotSuspect)} geo-flaggade`}
        {lastRefreshAt
          ? ` · Uppdaterad ${formatStockholmDateTime(lastRefreshAt)}`
          : " · Ej uppdaterad ännu"}
        {warnings.length > 0 ? ` · ${warnings.length} varning` : ""}
      </Link>
    </div>
  );
}
