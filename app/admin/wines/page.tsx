import Link from "next/link";
import { getWines } from "@/lib/actions/wines";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wines</h1>
          <p className="text-gray-600">Manage wine products</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/bulk-upload">
            <Button variant="outline" className="bg-gray-50 hover:bg-gray-100">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/admin/wines/new">
            <Button>Add Wine</Button>
          </Link>
        </div>
      </div>

      <AdminWinesContent
        wines={wines}
        initialMargin={initialMargin}
        isMixed={isMixed}
        initialB2BMargin={initialB2BMargin}
        isB2BMixed={isB2BMixed}
        exchangeRates={exchangeRates}
      />
    </div>
  );
}
