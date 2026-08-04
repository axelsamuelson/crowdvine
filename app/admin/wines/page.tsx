import Link from "next/link";
import { getWines } from "@/lib/actions/wines";
import { Button } from "@/components/ui/button";
import { Upload, Settings, Wine, Plus } from "lucide-react";
import { AdminWinesContent } from "./admin-wines-content";
import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";

async function fetchExchangeRates(
  currencies: string[],
): Promise<Record<string, number>> {
  const map: Record<string, number> = { SEK: 1 };
  const toFetch = currencies.filter((c) => c !== "SEK");
  if (toFetch.length === 0) return map;
  const base = getAppUrl();
  const headers = getInternalFetchHeaders();
  await Promise.all(
    toFetch.map(async (c) => {
      try {
        const res = await fetch(
          `${base}/api/exchange-rates?from=${c}&to=SEK`,
          { cache: "no-store", headers },
        );
        const data = res.ok ? await res.json() : null;
        if (data?.rate && Number.isFinite(data.rate)) map[c] = data.rate;
      } catch {
        /* ignore */
      }
    }),
  );
  return map;
}

export default async function WinesPage() {
  const wines = await getWines();

  const currencies = [
    ...new Set(
      wines
        .map((w: any) => w.cost_currency || "EUR")
        .filter((c: string) => c),
    ),
  ] as string[];
  const exchangeRates = await fetchExchangeRates(currencies);

  const margins = wines
    .map((w) => (w as any).margin_percentage)
    .map((v) => (typeof v === "number" ? v : Number(v)));
  const numericMargins = margins.filter((m) => Number.isFinite(m)) as number[];
  const hasMissing = margins.length > numericMargins.length;

  const first = numericMargins[0];
  const allSame =
    numericMargins.length > 0 &&
    numericMargins.every((m) => Math.abs(m - first) < 1e-9) &&
    !hasMissing;

  const isMixed = wines.length > 0 && !allSame;
  const initialMargin = allSame ? first : null;

  const b2bVals = wines.map((w) => {
    const v = (w as any).b2b_margin_percentage;
    if (v == null || v === "") return null;
    return Number.isFinite(Number(v)) ? Number(v) : null;
  });
  const numericB2B = b2bVals.filter((m): m is number => m != null);
  const allNullB2B = b2bVals.every((v) => v == null);
  const b2bFirst = numericB2B[0];
  const b2bAllSame =
    numericB2B.length > 0 &&
    numericB2B.every((m) => Math.abs(m - b2bFirst) < 1e-9) &&
    numericB2B.length === wines.length;
  const isB2BMixed = wines.length > 0 && !allNullB2B && !b2bAllSame;
  const initialB2BMargin =
    b2bAllSame && numericB2B.length > 0 ? b2bFirst : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
            <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              Wines
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Manage wine products
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <Link href="/admin/wines/settings" className="min-w-0">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1.5 rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700 sm:w-auto"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Settings</span>
            </Button>
          </Link>
          <Link href="/admin/bulk-upload" className="min-w-0">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full gap-1.5 rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700 sm:w-auto"
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Upload</span>
            </Button>
          </Link>
          <Link href="/admin/wines/new" className="min-w-0">
            <Button
              size="sm"
              className="h-9 w-full gap-1.5 rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Add</span>
            </Button>
          </Link>
        </div>
      </div>

      <AdminWinesContent
        wines={wines}
        initialMargin={initialMargin}
        isMixed={isMixed}
        initialB2BMargin={initialB2BMargin}
        isB2BMixed={isB2BMixed}
      />
    </div>
  );
}
