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
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Wine className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wines</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">Manage wine products</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/wines/settings">
            <Button variant="outline" size="sm" className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Settings
            </Button>
          </Link>
          <Link href="/admin/bulk-upload">
            <Button variant="outline" size="sm" className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/admin/wines/new">
            <Button size="sm" className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Wine
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
