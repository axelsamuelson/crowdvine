"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import {
  parseAnalyticsV2Filters,
  analyticsV2ToQueryString,
  defaultLast28Days,
  type AnalyticsV2FilterState,
} from "@/lib/analytics/v2/filters";
import { CHANNEL_LABELS, DEVICE_LABELS } from "@/lib/analytics/v2/labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const selectClass =
  "h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-white";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function AnalyticsFilterBar({
  forceSite,
}: {
  forceSite?: "pact" | "dirtywine";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseAnalyticsV2Filters(searchParams);
  const effectiveSite = forceSite ?? filters.site;

  const [fromDraft, setFromDraft] = useState(filters.from);
  const [toDraft, setToDraft] = useState(filters.to);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setFromDraft(filters.from);
    setToDraft(filters.to);
  }, [filters.from, filters.to]);

  useEffect(() => {
    if (forceSite && filters.site !== forceSite) {
      const merged = { ...filters, site: forceSite };
      const qs = analyticsV2ToQueryString(merged);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [forceSite, filters, pathname, router]);

  const push = useCallback(
    (next: Partial<AnalyticsV2FilterState>) => {
      const merged = {
        ...filters,
        ...next,
        site: forceSite ?? next.site ?? filters.site,
      };
      const qs = analyticsV2ToQueryString(merged);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router, forceSite],
  );

  const defaults = defaultLast28Days();

  const advancedCount = useMemo(() => {
    let n = 0;
    if (filters.market !== "all") n += 1;
    if (filters.invited !== "include") n += 1;
    if (filters.channel) n += 1;
    if (filters.device) n += 1;
    return n;
  }, [filters]);

  const siteControl = forceSite ? (
    <div className="flex h-9 shrink-0 items-center rounded-md border border-gray-200 px-3 text-sm dark:border-[#1F1F23]">
      {forceSite === "dirtywine" ? "Dirty Wine" : "PACT"}
    </div>
  ) : (
    <div className="inline-flex h-9 shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-[#1F1F23]">
      {(["pact", "dirtywine"] as const).map((s) => (
        <button
          key={s}
          type="button"
          className={
            effectiveSite === s
              ? "bg-gray-900 px-3 text-sm text-white dark:bg-white dark:text-gray-900"
              : "bg-white px-3 text-sm text-gray-700 dark:bg-[#0F0F12] dark:text-gray-300"
          }
          onClick={() => push({ site: s })}
        >
          {s === "pact" ? "PACT" : "Dirty Wine"}
        </button>
      ))}
    </div>
  );

  const dateAndGrain = (
    <>
      <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
        Från
        <input
          type="text"
          inputMode="numeric"
          aria-label="Från"
          placeholder="ÅÅÅÅ-MM-DD"
          className={`${selectClass} w-[9.5rem] font-mono tabular-nums`}
          value={fromDraft}
          onChange={(e) => setFromDraft(e.target.value)}
          onBlur={() => {
            const v = fromDraft.trim();
            push({
              from: ISO_DATE.test(v) ? v : filters.from || defaults.from,
            });
            if (!ISO_DATE.test(v)) setFromDraft(filters.from);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
        Till
        <input
          type="text"
          inputMode="numeric"
          aria-label="Till"
          placeholder="ÅÅÅÅ-MM-DD"
          className={`${selectClass} w-[9.5rem] font-mono tabular-nums`}
          value={toDraft}
          onChange={(e) => setToDraft(e.target.value)}
          onBlur={() => {
            const v = toDraft.trim();
            push({ to: ISO_DATE.test(v) ? v : filters.to || defaults.to });
            if (!ISO_DATE.test(v)) setToDraft(filters.to);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
        Gruppering
        <select
          aria-label="Gruppering"
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
        Jämför med
        <select
          aria-label="Jämför med"
          className={selectClass}
          value={filters.compare}
          onChange={(e) =>
            push({
              compare: e.target.value as AnalyticsV2FilterState["compare"],
            })
          }
        >
          <option value="none">Ingen jämförelse</option>
          <option value="previous">Föregående period</option>
          <option value="mom">Förra månaden</option>
        </select>
      </label>
    </>
  );

  const advancedFields = (
    <>
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
              channel: e.target.value === "all" ? null : e.target.value,
            })
          }
        >
          <option value="all">Alla</option>
          {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
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
          {Object.entries(DEVICE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <div className="space-y-2">
      {/* Desktop: one row */}
      <div className="hidden items-end gap-2 overflow-x-auto pb-1 md:flex md:flex-nowrap">
        {siteControl}
        <input
          type="text"
          inputMode="numeric"
          aria-label="Från"
          placeholder="ÅÅÅÅ-MM-DD"
          className={`${selectClass} w-[9.5rem] shrink-0 font-mono tabular-nums`}
          value={fromDraft}
          onChange={(e) => setFromDraft(e.target.value)}
          onBlur={() => {
            const v = fromDraft.trim();
            push({
              from: ISO_DATE.test(v) ? v : filters.from || defaults.from,
            });
            if (!ISO_DATE.test(v)) setFromDraft(filters.from);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="mb-2 shrink-0 text-xs text-gray-400">–</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Till"
          placeholder="ÅÅÅÅ-MM-DD"
          className={`${selectClass} w-[9.5rem] shrink-0 font-mono tabular-nums`}
          value={toDraft}
          onChange={(e) => setToDraft(e.target.value)}
          onBlur={() => {
            const v = toDraft.trim();
            push({ to: ISO_DATE.test(v) ? v : filters.to || defaults.to });
            if (!ISO_DATE.test(v)) setToDraft(filters.to);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <select
          aria-label="Gruppering"
          className={`${selectClass} shrink-0`}
          value={filters.grain}
          onChange={(e) =>
            push({ grain: e.target.value as AnalyticsV2FilterState["grain"] })
          }
        >
          <option value="day">Dag</option>
          <option value="week">Vecka</option>
          <option value="month">Månad</option>
        </select>
        <select
          aria-label="Jämför med"
          className={`${selectClass} shrink-0`}
          value={filters.compare}
          onChange={(e) =>
            push({
              compare: e.target.value as AnalyticsV2FilterState["compare"],
            })
          }
        >
          <option value="none">Ingen jämförelse</option>
          <option value="previous">Föregående period</option>
          <option value="mom">Förra månaden</option>
        </select>
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-sm dark:border-[#1F1F23]"
          onClick={() => setSheetOpen(true)}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filter{advancedCount > 0 ? ` (${advancedCount})` : ""}
        </button>
      </div>

      {/* Mobile: compact trigger → sheet */}
      <div className="flex items-center gap-2 md:hidden">
        {siteControl}
        <button
          type="button"
          className="inline-flex h-9 flex-1 items-center justify-between gap-2 rounded-md border border-gray-200 px-3 text-sm dark:border-[#1F1F23]"
          onClick={() => setMobileOpen(true)}
        >
          <span className="truncate tabular-nums text-gray-700 dark:text-gray-200">
            {filters.from} – {filters.to}
          </span>
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter{advancedCount > 0 ? ` (${advancedCount})` : ""}
          </span>
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-3 pb-8 sm:grid-cols-2">
            {advancedFields}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-3 pb-8">
            {dateAndGrain}
            {advancedFields}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
