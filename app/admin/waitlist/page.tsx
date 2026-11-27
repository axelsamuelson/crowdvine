import Link from "next/link";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  summarizeWaitlist,
  type WaitlistSignupRow,
} from "@/lib/waitlist/admin-summary";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("waitlist_signups")
    .select("country_code, cart_snapshot, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  const rows = (data ?? []) as WaitlistSignupRow[];
  const wineIds = [
    ...new Set(
      rows.flatMap((row) =>
        Array.isArray(row.cart_snapshot)
          ? row.cart_snapshot.map((line) =>
              String((line as { wine_id?: string }).wine_id ?? ""),
            )
          : [],
      ),
    ),
  ].filter(Boolean);
  const names = new Map<string, { name: string; producer: string }>();
  if (wineIds.length > 0) {
    const { data: wines } = await sb
      .from("wines")
      .select("id, wine_name, producer")
      .in("id", wineIds);
    for (const wine of wines ?? []) {
      names.set(String(wine.id), {
        name: String(wine.wine_name ?? wine.id),
        producer: String(wine.producer ?? ""),
      });
    }
  }
  const summaries = summarizeWaitlist(rows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Väntelista</h1>
        <Link href="/api/admin/waitlist" className="text-sm underline">
          CSV
        </Link>
      </div>
      {summaries.length === 0 ? <p>Inga anmälningar ännu.</p> : null}
      {summaries.map((summary) => (
        <section key={summary.countryCode} className="space-y-2">
          <h2 className="text-lg font-medium">
            {summary.countryCode}: {summary.signups} anmälningar, {summary.bottles} flaskor
          </h2>
          <ul className="text-sm">
            {summary.topWines.map((wine) => {
              const info = names.get(wine.wineId);
              return (
                <li key={wine.wineId}>
                  {info?.name ?? wine.wineId}
                  {info?.producer ? ` · ${info.producer}` : ""} — {wine.bottles}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
