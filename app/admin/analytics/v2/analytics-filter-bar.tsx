"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseAnalyticsV2Filters,
  analyticsV2ToQueryString,
  defaultLast28Days,
  type AnalyticsV2FilterState,
} from "@/lib/analytics/v2/filters";
import { CHANNEL_LABELS, DEVICE_LABELS } from "@/lib/analytics/v2/labels";

const selectClass =
  "h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-white";

export function AnalyticsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseAnalyticsV2Filters(searchParams);

  const push = useCallback(
    (next: Partial<AnalyticsV2FilterState>) => {
      const merged = { ...filters, ...next };
      const qs = analyticsV2ToQueryString(merged);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const defaults = defaultLast28Days();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Sajt
          <select
            className={selectClass}
            value={filters.site}
            onChange={(e) =>
              push({ site: e.target.value as "pact" | "dirtywine" })
            }
          >
            <option value="pact">PACT</option>
            <option value="dirtywine">Dirty Wine</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Från
          <input
            type="date"
            min="2026-08-07"
            className={selectClass}
            value={filters.from}
            onChange={(e) => push({ from: e.target.value || defaults.from })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Till
          <input
            type="date"
            min="2026-08-07"
            className={selectClass}
            value={filters.to}
            onChange={(e) => push({ to: e.target.value || defaults.to })}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Gruppering
          <select
            className={selectClass}
            value={filters.grain}
            onChange={(e) =>
              push({ grain: e.target.value as AnalyticsV2FilterState["grain"] })
            }
          >
            <option value="day">Dag</option>
            <option value="week">Vecka</option>
            <option value="month">Månad</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Marknad
          <select
            className={selectClass}
            value={filters.market}
            onChange={(e) => push({ market: e.target.value })}
          >
            <option value="all">Alla marknader</option>
            <option value="SE">Sverige</option>
            <option value="other">Övriga</option>
            <option value="unknown">Okänt land</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Inbjudna vänner
          <select
            className={selectClass}
            value={filters.invited}
            onChange={(e) =>
              push({
                invited: e.target.value as AnalyticsV2FilterState["invited"],
              })
            }
          >
            <option value="include">Inkludera</option>
            <option value="exclude">Exkludera</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Kanal
          <select
            className={selectClass}
            value={filters.channel ?? "all"}
            onChange={(e) =>
              push({
                channel:
                  e.target.value === "all" ? null : e.target.value,
              })
            }
          >
            <option value="all">Alla</option>
            {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Enhet
          <select
            className={selectClass}
            value={filters.device ?? "all"}
            onChange={(e) =>
              push({
                device:
                  e.target.value === "all"
                    ? null
                    : (e.target.value as AnalyticsV2FilterState["device"]),
              })
            }
          >
            <option value="all">Alla</option>
            {Object.entries(DEVICE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
          Jämför med
          <select
            className={selectClass}
            value={filters.compare}
            onChange={(e) =>
              push({
                compare: e.target.value as AnalyticsV2FilterState["compare"],
              })
            }
          >
            <option value="previous">Föregående period</option>
            <option value="mom">Samma period förra månaden</option>
            <option value="none">Ingen</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Session = unik fliksession (sessionStorage). Ingen 30-minutersregel.
        Tidigaste datum är 2026-08-07.
      </p>
    </div>
  );
}
