"use client";

import { Suspense, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnalyticsPageShell } from "../v2/analytics-page-shell";
import { SimpleFetchPanel } from "../v2/simple-fetch-panel";
import { formatSvNumber } from "@/lib/analytics/v2/labels";
import { isLowN } from "@/lib/analytics/v2/wilson";
import { LowNBanner, lowNNumberClass } from "../v2/low-n-banner";
import {
  ScrollTable,
  stickyFirstTd,
  stickyFirstTh,
} from "../v2/scroll-table";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WineRow = {
  product_id: string;
  product_name: string | null;
  list_sessions: number;
  pdp_sessions: number;
  cart_sessions: number;
  checkout_sessions: number;
  purchase_sessions: number;
};

type ProductsData = {
  status: {
    beforeFilter: number;
    afterFilter: number;
    prerenderSuspect: number;
    geoBotSuspect?: number;
    lastRefreshAt: string | null;
    warnings?: string[];
  };
  wines: WineRow[];
  lists: Array<{ path: string; sessions: number }>;
  unattributedPdp?: number;
};

type WineSortKey =
  | "name"
  | "list"
  | "pdp"
  | "cart"
  | "checkout"
  | "purchase";

type SortDir = "asc" | "desc";

const WINE_SORT_LABELS: Record<WineSortKey, string> = {
  name: "Vin",
  list: "Lista",
  pdp: "Produkt",
  cart: "Varukorg",
  checkout: "Kassa",
  purchase: "Köp",
};

function wineSortValue(w: WineRow, key: WineSortKey): string | number {
  switch (key) {
    case "name":
      return (w.product_name || w.product_id).toLocaleLowerCase("sv");
    case "list":
      return w.list_sessions;
    case "pdp":
      return w.pdp_sessions;
    case "cart":
      return w.cart_sessions;
    case "checkout":
      return w.checkout_sessions;
    case "purchase":
      return w.purchase_sessions;
  }
}

function sortWines(rows: WineRow[], key: WineSortKey, dir: SortDir): WineRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = wineSortValue(a, key);
    const bv = wineSortValue(b, key);
    if (typeof av === "number" && typeof bv === "number") {
      if (av === bv) {
        return (a.product_name || a.product_id).localeCompare(
          b.product_name || b.product_id,
          "sv",
        );
      }
      return (av - bv) * mul;
    }
    return String(av).localeCompare(String(bv), "sv") * mul;
  });
}

function SortableTh({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  column: WineSortKey;
  label: string;
  sortBy: WineSortKey;
  sortDir: SortDir;
  onSort: (column: WineSortKey) => void;
  className?: string;
}) {
  const active = sortBy === column;
  return (
    <th className={cn("py-2 text-xs font-medium text-gray-600", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md transition-colors hover:text-gray-900 dark:hover:text-zinc-100",
          active && "text-gray-900 dark:text-zinc-100",
        )}
        aria-sort={
          active ? (sortDir === "desc" ? "descending" : "ascending") : "none"
        }
      >
        {label}
        {active ? (
          sortDir === "desc" ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 opacity-30"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

function WinesPanel({ data }: { data: ProductsData }) {
  const [sortBy, setSortBy] = useState<WineSortKey>("pdp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function onSort(column: WineSortKey) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(column === "name" ? "asc" : "desc");
    }
  }

  const sorted = sortWines(data.wines, sortBy, sortDir);
  const anyLow = sorted.some((w) => isLowN(w.pdp_sessions));

  return (
    <>
      <LowNBanner show={anyLow} entity="vin" />
      <div className="flex items-center gap-2 sm:hidden">
        <span className="text-xs text-gray-500">Sortera:</span>
        <Select
          value={`${sortBy}-${sortDir}`}
          onValueChange={(v) => {
            const dash = v.lastIndexOf("-");
            const key = (dash === -1 ? v : v.slice(0, dash)) as WineSortKey;
            const dir = (dash === -1 ? "desc" : v.slice(dash + 1)) as SortDir;
            setSortBy(key);
            setSortDir(dir);
          }}
        >
          <SelectTrigger className="h-9 flex-1 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WINE_SORT_LABELS) as WineSortKey[]).flatMap((key) => {
              const label = WINE_SORT_LABELS[key];
              if (key === "name") {
                return [
                  <SelectItem key={`${key}-asc`} value={`${key}-asc`}>
                    {label} (A→Ö)
                  </SelectItem>,
                  <SelectItem key={`${key}-desc`} value={`${key}-desc`}>
                    {label} (Ö→A)
                  </SelectItem>,
                ];
              }
              return [
                <SelectItem key={`${key}-desc`} value={`${key}-desc`}>
                  {label} (högst först)
                </SelectItem>,
                <SelectItem key={`${key}-asc`} value={`${key}-asc`}>
                  {label} (lägst först)
                </SelectItem>,
              ];
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 sm:hidden">
        {sorted.map((w) => {
          const low = isLowN(w.pdp_sessions);
          return (
            <div
              key={w.product_id}
              className="rounded-xl border border-gray-200 p-4 dark:border-[#1F1F23]"
            >
              <div className="font-medium">
                {w.product_name || w.product_id}
              </div>
              <dl
                className={cn(
                  "mt-2 grid grid-cols-2 gap-1 text-xs tabular-nums",
                  lowNNumberClass(low),
                )}
              >
                <div>Lista · {formatSvNumber(w.list_sessions)}</div>
                <div>Produkt · {formatSvNumber(w.pdp_sessions)}</div>
                <div>Varukorg · {formatSvNumber(w.cart_sessions)}</div>
                <div>Kassa · {formatSvNumber(w.checkout_sessions)}</div>
                <div>Köp · {formatSvNumber(w.purchase_sessions)}</div>
              </dl>
            </div>
          );
        })}
      </div>
      <div className="hidden sm:block">
        <ScrollTable minWidth="640px">
          <thead>
            <tr>
              <SortableTh
                column="name"
                label="Vin"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className={`${stickyFirstTh} pl-4`}
              />
              <SortableTh
                column="list"
                label="Lista"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="pdp"
                label="Produkt"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="cart"
                label="Varukorg"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="checkout"
                label="Kassa"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="purchase"
                label="Köp"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="pr-4"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((w) => {
              const low = isLowN(w.pdp_sessions);
              const numClass = cn("py-2 tabular-nums", lowNNumberClass(low));
              return (
                <tr
                  key={w.product_id}
                  className="border-t border-gray-100 dark:border-zinc-800"
                >
                  <td className={`${stickyFirstTd} pl-4`}>
                    {w.product_name || w.product_id}
                  </td>
                  <td className={numClass}>
                    {formatSvNumber(w.list_sessions)}
                  </td>
                  <td className={numClass}>
                    {formatSvNumber(w.pdp_sessions)}
                  </td>
                  <td className={numClass}>
                    {formatSvNumber(w.cart_sessions)}
                  </td>
                  <td className={numClass}>
                    {formatSvNumber(w.checkout_sessions)}
                  </td>
                  <td className={cn(numClass, "pr-4")}>
                    {formatSvNumber(w.purchase_sessions)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ScrollTable>
      </div>
    </>
  );
}

export default function ProdukterPage() {
  const [tab, setTab] = useState<"lists" | "wines">("wines");
  return (
    <AnalyticsPageShell
      title="Produkter"
      subtitle="Vilka listor och viner drar intresse, och var tappar produktsidan?"
    >
      <div className="flex gap-2">
        <button
          type="button"
          className={
            tab === "wines"
              ? "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
              : "rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-[#1F1F23]"
          }
          onClick={() => setTab("wines")}
        >
          Viner
        </button>
        <button
          type="button"
          className={
            tab === "lists"
              ? "rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-gray-900"
              : "rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-[#1F1F23]"
          }
          onClick={() => setTab("lists")}
        >
          Listor
        </button>
      </div>
      <Suspense fallback={<div className="admin-skel h-32 rounded-xl" />}>
        <SimpleFetchPanel<ProductsData> endpoint="/api/admin/analytics/v2/products">
          {(data) =>
            tab === "wines" ? (
              data.wines.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Inga produktsidor visade i perioden.
                  </p>
                  {data.unattributedPdp && data.unattributedPdp > 0 ? (
                    <p className="mt-2 text-xs text-gray-500">
                      {formatSvNumber(data.unattributedPdp)} besök hade
                      produktside-event utan produkt-id (räknas inte här).
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <WinesPanel data={data} />
                </div>
              )
            ) : (
              <div className="hidden sm:block">
                <ScrollTable>
                  <thead>
                    <tr className="text-xs font-medium text-gray-600">
                      <th className={`${stickyFirstTh} pl-4`}>Sida</th>
                      <th className="py-2 pr-4">Besök till lista</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lists.map((l) => (
                      <tr
                        key={l.path}
                        className="border-t border-gray-100 tabular-nums dark:border-zinc-800"
                      >
                        <td
                          className={`${stickyFirstTd} pl-4 font-mono text-xs`}
                        >
                          {l.path}
                        </td>
                        <td
                          className={cn(
                            "py-2 pr-4",
                            lowNNumberClass(isLowN(l.sessions)),
                          )}
                        >
                          {formatSvNumber(l.sessions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ScrollTable>
                {data.lists.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Inga listbesök i perioden.
                  </p>
                ) : null}
              </div>
            )
          }
        </SimpleFetchPanel>
      </Suspense>
    </AnalyticsPageShell>
  );
}
